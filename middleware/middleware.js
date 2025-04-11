const Joi = require("joi")
const jwt = require("jsonwebtoken")
const Fnc = require("./functions")

const creatUserSchema = Joi.object({
  full_name: Joi.string()
    .pattern(/^[a-zA-Z]+ [a-zA-Z]+$/)
    .required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(42).required(),
  role: Joi.string().valid("admin", "user").required(),
  createdAt: Joi.date().iso().required(),
})

const loginUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(42).required(),
})

const tshirtSchema = Joi.object({
  sku: Joi.string().required(),
  gender: Joi.string().valid("male", "female", "child", "unisex").required(),
  model: Joi.string().required(),
  size: Joi.string().required(),
  custom_name: Joi.string().required(),
  custom_number: Joi.number().required(),
  price: Joi.number().precision(2).required(),
  stock: Joi.number().required(),
})

const updateTshirtSchema = Joi.object({
  sku: Joi.string().optional(),
  gender: Joi.string().valid("male", "female", "child", "unisex").optional(),
  model: Joi.string().optional(),
  size: Joi.string().optional(),
  custom_name: Joi.string().optional(),
  custom_number: Joi.number().optional(),
  price: Joi.number().precision(2).optional(),
  stock: Joi.number().optional(),
})

const cartSchema = Joi.object({
  userId: Joi.string().required(),
  tshirts: Joi.array()
    .items(
      Joi.object({
        tshirtId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(0)
    .required(),
  lastUpdated: Joi.date().iso().required(),
  totalItems: Joi.number().integer().min(0).required(),
})

const orderSchema = Joi.object({
  userId: Joi.string().required(), // ID do usuário que fez o pedido
  tshirts: Joi.array()
    .items(
      Joi.object({
        tshirtId: Joi.string().required(), // ID do livro
        quantity: Joi.number().integer().min(1).required(), // Quantidade de livros (mínimo 1)
      })
    )
    .min(0)
    .required(), // Deve ser um array válido, mesmo que vazio
  status: Joi.string()
    .valid("placed", "canceled", "paid") // Status do pedido
    .required(),
  timestamp: Joi.date().iso().required(), // Data e hora do pedido
  totalPrice: Joi.number().precision(2).min(0).required(), // Preço total do pedido com duas casas decimais
  shippingAddress: Joi.object({
    street: Joi.string().required(), // Rua (ex.: "Rua das Flores")
    city: Joi.string().required(), // Cidade (ex.: "Lisboa")
    district: Joi.string().required(), // Distrito (ex.: "Lisboa")
    postalCode: Joi.string()
      .pattern(/^\d{4}-\d{3}$/) // Código postal no formato português (ex.: "1234-567")
      .required(),
    country: Joi.string().valid("Portugal").required(), // País (fixado como "Portugal")
  }).required(), // Endereço de envio obrigatório
});







const decodeUserId = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" })
  }

  jwt.verify(token, "edit123", (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" })
    }

    req.userId = decoded.userId
    req.userRole = decoded.userRole

    next()
  })
}

const generateToken = (userId, userRole) => {
  const payload = {
    userId: userId,
    userRole: userRole,
  }

  return jwt.sign(payload, "edit123", { expiresIn: "999h" })
}

module.exports = {
  decodeUserId,
  generateToken,
  loginUserSchema,
  creatUserSchema,
  tshirtSchema,
  updateTshirtSchema,
  cartSchema,
  orderSchema
}
