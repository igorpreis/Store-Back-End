const { orderSchema } = require("../middleware/middleware")
const Functions = require("../middleware/functions")
const db = require("../firebase/firebaseConfig")

async function createOrder(req, res) {
  const { userId } = req
  const { shippingAddress } = req.body

  if (req.userRole !== "user") {
    return res.status(403).json("Access denied. Only authenticated users are allowed to create a order.")
  }

  if (!userId) {
    return res.status(403).json({ error: "Access denied. Only authenticated users are allowed to create a order." })
  }

  if (Functions.isEmpty(req.body)) {
    return res.status(400).json({ error: "No data was sent in the Body." })
  }

  try {
    // Buscar o carrinho do usuário
    const cartCol = await db.collection("cart").where("userId", "==", userId).limit(1).get()

    // Verificar se o carrinho existe
    if (cartCol.empty) {
      return res.status(404).json({ error: "That User has no cart." })
    }

    // Obter a data do carrinho
    const cartDoc = cartCol.docs[0]
    const cartData = cartDoc.data()

    // Confirmar se tshirts exitem
    const tshirts = Array.isArray(cartData.tshirts) ? cartData.tshirts : []

    if (tshirts.length === 0) {
      return res.status(404).json({ error: "This cart does not have any shirts to place an order." })
    }

    // Criar Order
    const order = {
      userId: userId,
      tshirts: tshirts,
      status: "placed",
      timestamp: new Date().toISOString(),
      totalPrice: parseFloat((await Functions.totalPrice(tshirts)).toFixed(2)),
      shippingAddress: shippingAddress,
    }

    const { error } = orderSchema.validate(order)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    //Validar Stock
    const stockCheck = await Functions.stockCheck(tshirts)

    if (stockCheck.noStock.length > 0) {
      return res.status(404).json({
        error: "Items out of stock.",
        items: `Missing items: ${stockCheck.noStock}`,
      })
    }

    //Atualizar Stock
    const stockUpdate = await Functions.stockUpdate(tshirts)

    // Criar a order
    await db.collection("order").add(order)

    // Zerar Carrinho
    await db.collection("cart").doc(cartDoc.id).update(Functions.emptyCart())

    // Retornar sucesso
    return res.status(200).json({ message: `Order created sucessfull`, order: order })
  } catch (error) {
    console.error("Error creating order:", error)
    return res.status(500).json({ error: "An unexpected error occurred while creating the order." })
  }
}

async function getOrders(req, res) {
  try {
    const orders = await db.collection("order").get()
    if (orders.empty) {
      return res.status(404).json({ error: "No orders found." })
    }

    const colOrders = orders.docs.map((item) => ({ id: item.id, ...item.data() }))
    return res.json(colOrders)
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return res.status(500).json({ error: "Erro interno do servidor" })
  }
}

async function cancelOrder(req, res) {
  const { orderId } = req.params
  const { userId } = req

  try {
    const orderDoc = await db.collection("order").doc(orderId).get()
    const orderData = orderDoc.data()

    if (orderData.userId !== userId) {
      return res.status(403).json({ error: "Access denied. Only the user who owns the order can request cancellation." })
    }

    if (orderData.status === "canceled") {
      return res.status(422).json({ error: `This Order has already been cancelled.` })
    }

    if (orderData.status !== "placed") {
      return res.status(422).json({ error: `Only Orders with "Placed" Status can be Cancelled.` })
    } else {
      await db.collection("order").doc(orderId).update({ status: "canceled" })

      //Retornar Tshirts para o Stock
      await Functions.stockReturn(orderData.tshirts)

      return res.status(200).json({ message: `Order cancelled successfully` })
    }
  } catch (error) {
    console.error("Error cancelling order:", error)
    return res.status(500).json({ error: "An unexpected error occurred while cancelling the order. Please try again later." })
  }
}

async function payOrder(req, res) {
  const { orderId } = req.params
  const { userId } = req

  try {
    const orderDoc = await db.collection("order").doc(orderId).get()
    const orderData = orderDoc.data()

    if (orderData.userId !== userId) {
      return res.status(403).json({ error: "Access denied. Only the user who owns the order can make the payment." })
    }

    if (orderData.status === "canceled") {
      return res.status(422).json({ error: "Cancelled orders cannot be paid." })
    }

    if (orderData.status !== "placed") {
      return res.status(422).json({ error: `Only orders with "Placed" status can be paid.` })
    } else {
      await db.collection("order").doc(orderId).update({ status: "paid" })
      return res.status(200).json({ message: "Order paid successfully" })
    }
  } catch (error) {
    console.error("Error payment order:", error)
    return res.status(500).json({ error: "An unexpected error occurred while cancelling the order. Please try again later." })
  }
}

module.exports = {
  createOrder,
  getOrders,
  cancelOrder,
  payOrder,
}
