const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')
const { decodeUserId } = require("../middleware/middleware")


router.post('/', decodeUserId, orderController.createOrder)
router.get('/', orderController.getOrders)
router.put('/:orderId/cancel', decodeUserId, orderController.cancelOrder)
router.put('/:orderId/pay', decodeUserId, orderController.payOrder)





module.exports = router