const { cartSchema } = require("../middleware/middleware")
const Functions = require("../middleware/functions")
const db = require("../firebase/firebaseConfig")

async function createCart(req, res) {
  const { userId } = req
  const { tshirts } = req.body

  if (req.userRole !== "user") {
    return res.status(403).json({ error: "Access denied. Only authenticated users are allowed to create a cart." })
  }

  if (Functions.isEmpty(req.body)) {
    return res.status(400).json({ error: "No data was sent in the Body." })
  }

  if (!Array.isArray(tshirts)) {
    return res.status(400).json({ error: "T-shirts must be an array." })
  }

  try {
    const checkCart = await db.collection("cart").where("userId", "==", userId).get()

    if (!checkCart.empty) {
      return res.status(409).json({ error: "This user already has a cart, please make a Put instead of a Post." })
    }

    const cart = {
      userId,
      tshirts,
      lastUpdated: new Date().toISOString(),
      totalItems: Functions.CalcTotalItems(tshirts),
    }

    const { error } = cartSchema.validate(cart)
    if (error) {
      return res.status(400).json(error)
    }

    const isDuplicate = Functions.hasDuplicates(cart.tshirts, "tshirtId")
    if (isDuplicate.success) {
      return res.status(400).json({ error: "Duplicate T-shirt IDs are not allowed.", duplicates: isDuplicate.duplicate })
    }

    const stockCheck = await Functions.stockCheck(tshirts)
    if (stockCheck.noStock.length > 0) {
      return res.status(404).json({ error: "Items out of stock.", items: stockCheck.noStock })
    }

    const newCart = await db.collection("cart").add(cart)
    return res.status(201).json({ message: "Cart created successfully", cartId: newCart.id, cart })
  } catch (error) {
    console.error("Error creating cart:", error)
    return res.status(500).json({ error: "Failed to create cart in database" })
  }
}

async function updateCart(req, res) {
  if (Functions.isEmpty(req.body)) {
    return res.status(400).json({ error: "No data was sent in the Body." })
  }

  const { userId } = req
  const { tshirts } = req.body

  // Check Cart exists
  let getCart
  let getCartId
  try {
    getCart = await db.collection("cart").where("userId", "==", userId).get()

    if (getCart.empty) {
      return res.status(404).json({ error: "That User has no cart" })
    } else {
      getCartId = getCart.docs[0].id
    }
  } catch (error) {
    return res.status(500).json({ error: "Check Cart exists fail" })
  }

  const cart = {
    userId: userId,
    tshirts: tshirts,
    lastUpdated: new Date().toISOString(),
    totalItems: Functions.CalcTotalItems(tshirts),
  }

  const { error } = cartSchema.validate(cart)
  if (error) {
    return res.status(400).json(error)
  }

  //Verify Duplicate Items
  const isDuplicate = Functions.hasDuplicates(cart.tshirts, "tshirtId")
  if (isDuplicate.success) {
    return res.status(400).json({ error: "Duplicate T-shirt IDs are not allowed.", duplicates: isDuplicate.duplicate })
  }

  // Verify Tshirts IDs Exist
  try {
    const result = await Functions.verifyTshirtIds(cart.tshirts)

    if (!result.success) {
      return res.status(400).json({
        error: "T-shirt IDs do not exist in the database.",
        missingIds: result.missingIds,
      })
    }
  } catch (error) {
    return res.status(500).json({ error: "Verify Tshirts IDs" })
  }

  // Update Cart
  try {
    const updateCart = await db.collection("cart").doc(getCartId).update(cart)
    return res.status(200).json({
      message: "Cart updated successfully",
      cartId: getCartId,
      cart: cart,
    })
  } catch (error) {
    return res.status(500).json({ error: "Failed to update Cart in the database." })
  }
}

async function getCart(req, res) {
  const { userId } = req

  if (!userId) {
    return res.status(401).json({ error: "Please log in to see your cart." })
  }

  try {
    const getCart = await db.collection("cart").where("userId", "==", userId).limit(1).get()

    if (getCart.empty) {
      return res.status(404).json({ error: "That User has no cart" })
    } else {
      const colCart = getCart.docs.map((item) => {
        return { id: item.id, ...item.data() }
      })
      return res.status(200).json(colCart)
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" })
  }
}

async function deleteItemCart(req, res) {
  const { userId } = req
  const { id: tshirtId } = req.params

  // Verificar se os IDs existem
  if (!userId) {
    return res.status(400).json({ error: "Please log in to see your cart." })
  }
  if (!tshirtId || typeof tshirtId !== "string") {
    return res.status(400).json({ error: "Please provide a valid T-shirt ID to delete." })
  }
  try {
    // Buscar o carrinho do usuário
    const cartCol = await db.collection("cart").where("userId", "==", userId).limit(1).get()

    // Verificar se o carrinho existe
    if (cartCol.empty) {
      return res.status(404).json({ error: "That User has no cart." })
    }

    // Obter o primeiro documento do carrinho
    const cartDoc = cartCol.docs[0]
    const cartData = cartDoc.data()

    // Confirmar se tshirts é um array válido
    const tshirts = Array.isArray(cartData.tshirts) ? cartData.tshirts : []

    // Verificar se a Tshirt a ser deletada existe
    const tshirtExists = tshirts.some((item) => item.tshirtId === tshirtId)

    if (!tshirtExists) {
      return res.status(404).json({ error: `T-shirt with ID ${tshirtId} not found in the cart.` })
    }

    // Criar novo Array sem a Tshirt excluída
    const updatedTshirts = tshirts.filter((item) => item.tshirtId !== tshirtId)

    // Criar carrinho sem a Tshirt deletada
    const updatedCart = {
      userId: userId,
      tshirts: updatedTshirts,
      lastUpdated: new Date().toISOString(),
      totalItems: Functions.CalcTotalItems(updatedTshirts),
    }

    const { error } = cartSchema.validate(updatedCart)
    if (error) {
      return res.status(400).json(error)
    }

    // Atualizar carrinho
    await db.collection("cart").doc(cartDoc.id).update(updatedCart)

    // Retornar sucesso
    return res.status(200).json({ message: `T-shirt with ID ${tshirtId} deleted successfully from the cart.`, cart: updatedCart })
  } catch (error) {
    console.error("Error deleting T-shirt from cart:", error)
    return res.status(500).json({ error: error.message || "Internal server error" })
  }
}

module.exports = {
  createCart,
  updateCart,
  getCart,
  deleteItemCart,
}
