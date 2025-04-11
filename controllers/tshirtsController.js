const { tshirtSchema, updateTshirtSchema } = require("../middleware/middleware")
const Functions = require("../middleware/functions")

const db = require("../firebase/firebaseConfig")

async function getTshirts(req, res) {
  try {
    const tshirt = await db.collection("tshirts").get()
    const colTshirt = tshirt.docs.map((item) => {
      return { id: item.id, ...item.data() }
    })
    return res.json(colTshirt)
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return res.status(500).json({ error: "Erro interno do servidor" })
  }
}

async function createTshirt(req, res) {
  if (req.userRole !== "admin") {
    return res.status(403).json("Access denied. Only Administrators can add products.")
  }

  if (Functions.isEmpty(req.body)) {
    return res.status(400).json("No data was sent in the Body")
  }

  const { sku, gender, model, size, custom_number, custom_name, price, stock } = req.body

  const isDuplicate = await db.collection("tshirts").where("sku", "==", sku).get()

  if (!isDuplicate.empty) {
    return res.status(400).json({ error: "This SKU already exists in the database." })
  }
  const tshirt = {
    sku: sku.toUpperCase(),
    gender: gender.toLowerCase(),
    model: model,
    size: size,
    custom_name: custom_name,
    custom_number: custom_number,
    price: price,
    stock: stock,
  }

  const { error } = tshirtSchema.validate(tshirt)
  if (error) {
    return res.status(400).json(error)
  }

  try {
    const createdTshirt = await db.collection("tshirts").add(tshirt)
    return res.status(201).json({
      message: "Tshirt created successfully",
      tshirtId: createdTshirt.id,
      tshirt: tshirt,
    })
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create the T-shirt in the database.",
      details: error.message,
    })
  }
}

async function updateTshirt(req, res) {
  const id = req.params.id

  // Check if user is admin
  if (req.userRole !== "admin") {
    return res.status(403).json("Access denied. Only Administrators can update products.")
  }

  // Check if body is empty
  if (Functions.isEmpty(req.body)) {
    return res.status(400).json("No data was sent in the Body")
  }

  // Check if item exists
  let tshirtData
  try {
    tshirtData = await Functions.checkId("tshirts", id)
    if (!tshirtData.exists) {
      return res.status(404).json({ error: tshirtData.message })
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" })
  }

  const { sku, gender, model, size, custom_number, custom_name, price, stock } = req.body

  // Send only available data
  const tshirt = {
    ...(sku && { sku: sku.toUpperCase() }),
    ...(gender && { gender: gender.toLowerCase() }),
    ...(model && { model }),
    ...(size && { size }),
    ...(custom_name && { custom_name }),
    ...(custom_number && { custom_number }),
    ...(price && { price }),
    ...(stock && { stock }),
  }

  // Validate with Joi schema
  const { error } = updateTshirtSchema.validate(tshirt)
  if (error) {
    return res.status(400).json({ error: error.details.map((detail) => detail.message) })
  }

  // No Change Check
  const oldData = tshirtData.data

  const hasChanges = Object.entries(tshirt).some(([key, value]) => oldData[key] !== value)

  if (!hasChanges) {
    return res.status(200).json({ message: "No changes detected. No updates were made to the item." })
  }

  // Update item in database
  try {
    const updateTshirt = await db.collection("tshirts").doc(id).update(tshirt)
    return res.status(200).json({
      message: "Tshirt updated successfully",
      tshirtId: id,
      data_update: tshirt,
      update: updateTshirt,
    })
  } catch (error) {
    return res.status(500).json({ error: "Failed to update the item in the database." })
  }
}

async function deleteTshirt(req, res) {
  if (req.userRole !== "admin") {
    return res.status(403).json("Access denied. Only Administrators can delete products.")
  }

  const id = req.params.id

  const tshirtDoc = await db.collection("tshirts").doc(id).get()

  if (tshirtDoc.exists) {
    await db.collection("tshirts").doc(id).delete()
    await Functions.delTshirtCarts(id)
    return res.status(200).json({
      message: `T-shirt Id: ${id} deleted successfully`,
    })
  } else {
    return res.status(404).json({
      error: "Product not found.",
    })
  }
}

module.exports = {
  createTshirt,
  getTshirts,
  updateTshirt,
  deleteTshirt,
}
