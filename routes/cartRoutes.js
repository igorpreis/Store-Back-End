const express = require('express')
const router = express.Router()
const cartController = require('../controllers/cartController')
const { decodeUserId } = require("../middleware/middleware")


router.post('/', decodeUserId, cartController.createCart)
router.put('/', decodeUserId, cartController.updateCart)
router.get('/', decodeUserId, cartController.getCart)
router.delete('/:id', decodeUserId, cartController.deleteItemCart)




module.exports = router