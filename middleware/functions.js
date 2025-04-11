const db = require("../firebase/firebaseConfig")

function isEmpty(obj) {
  return Object.keys(obj).length === 0
}

async function checkId(collectionName, id) {
  try {
    const item = await db.collection(collectionName).doc(id).get()
    if (!item.exists) {
      return { exists: false, message: `No item found with ID: ${id}` }
    }
    return { exists: true, data: item.data() }
  } catch (error) {
    console.error("Error checking ID:", error)
    throw new Error("Database error occurred")
  }
}

function hasDuplicates(array, key) {
  let result = false
  let duplicate = []
  for (let i = 0; i < array.length; i++) {
    for (let j = i + 1; j < array.length; j++) {
      if (array[i][key] === array[j][key]) {
        duplicate.push(array[i][key])
        result = true
      } // Encontrou duplicada
    }
  }
  return { success: result, duplicate: duplicate } // Não encontrou duplicada
}

async function verifyTshirtIds(tshirts) {
  try {
    //Tshirts IDs Map
    const tshirtIdsToVerify = tshirts.map((item) => item.tshirtId)

    const verifiedTshirtsList = await db.collection("tshirts").where("__name__", "in", tshirtIdsToVerify).get()

    // Verifiquei se todos os IDs existem no banco de dados
    if (verifiedTshirtsList.size !== tshirtIdsToVerify.length) {
      const existingTshirtIds = verifiedTshirtsList.docs.map((doc) => doc.id)

      // Identificar quais IDs estão faltando
      const missingTshirtIds = tshirtIdsToVerify.filter((id) => !existingTshirtIds.includes(id))

      return {
        success: false,
        missingIds: missingTshirtIds,
      }
    }

    // Todos os IDs foram verificados com sucesso
    return { success: true }
  } catch (error) {
    throw new Error("Error verifying T-shirt IDs: " + error.message)
  }
}

function CalcTotalItems(tshirts) {
  return tshirts.reduce((total, item) => total + item.quantity, 0)
}

async function totalPrice(tshirts) {
  let totalPrice = 0
  for (const tshirt of tshirts) {
    const tshirtDoc = await db.collection("tshirts").doc(tshirt.tshirtId).get()
    const tshirtPrice = tshirtDoc.data().price

    totalPrice += tshirt.quantity * tshirtPrice
  }
  return totalPrice
}

async function stockCheck(tshirts) {
  const noStock = []
  for (const tshirt of tshirts) {
    const tshirtDoc = await db.collection("tshirts").doc(tshirt.tshirtId).get()
    const tshirtStock = tshirtDoc.data().stock

    if (tshirt.quantity > tshirtStock) {
      noStock.push(tshirt.tshirtId)
    }
  }
  return { noStock: noStock }
}

async function stockUpdate(tshirts) {
  for (const tshirt of tshirts) {
    const tshirtRef = db.collection("tshirts").doc(tshirt.tshirtId)
    const tshirtDoc = await tshirtRef.get()
    const currentStock = tshirtDoc.data().stock
    const updatedStock = currentStock - tshirt.quantity
    await tshirtRef.update({ stock: updatedStock })
  }
}

async function stockReturn(tshirts) {
  for (const tshirt of tshirts) {
    const tshirtRef = db.collection("tshirts").doc(tshirt.tshirtId)
    const tshirtDoc = await tshirtRef.get()
    const currentStock = tshirtDoc.data().stock
    const updatedStock = currentStock + tshirt.quantity
    await tshirtRef.update({ stock: updatedStock })
  }
}

function emptyCart() {
  const cart = {
    tshirts: [],
    lastUpdated: new Date().toISOString(),
    totalItems: 0,
  }

  return cart
}

async function delTshirtCarts(tshirtId) {
  try {
    // 1. Buscar todos os carrinhos
    const carts = await db.collection("cart").get()

    // 2. Atualizar cada carrinho
    const updates = []

    carts.forEach((cart) => {
      const data = cart.data()

      // Confirmar se "items" é um array válido
      const items = Array.isArray(data.tshirts) ? data.tshirts : []

      // Verificar se o carrinho contém a T-shirt
      const exists = items.some((i) => i.tshirtId === tshirtId)

      if (exists) {
        // Remover a T-shirt do array
        const updatedItems = items.filter((i) => i.tshirtId !== tshirtId)

        // Recalcular o total de itens
        const updatedCart = {
          ...data,
          tshirts: updatedItems,
          lastUpdated: new Date().toISOString(),
          totalItems: CalcTotalItems(updatedItems),
        }

        // Adicionar a atualização à lista de promessas
        updates.push(db.collection("cart").doc(cart.id).update(updatedCart))
      }
    })

    // 3. Executar todas as atualizações em paralelo
    await Promise.all(updates)

    console.log(`T-shirt with ID ${tshirtId} removed from all carts and totals recalculated.`)
  } catch (err) {
    console.error("Error deleting T-shirt and updating carts:", err)
    throw new Error(err.message || "Failed to delete T-shirt and update carts.")
  }
}

module.exports = {
  isEmpty,
  checkId,
  hasDuplicates,
  verifyTshirtIds,
  CalcTotalItems,
  totalPrice,
  stockCheck,
  stockUpdate,
  stockReturn,
  emptyCart,
  delTshirtCarts,
}
