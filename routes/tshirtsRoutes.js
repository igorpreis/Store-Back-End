const express = require('express')
const router = express.Router()
const tshirtsController = require('../controllers/tshirtsController')
const { decodeUserId } = require("../middleware/middleware")


router.post('/', decodeUserId, tshirtsController.createTshirt)
router.get('/', tshirtsController.getTshirts)
router.put('/:id', decodeUserId, tshirtsController.updateTshirt)
router.delete('/:id', decodeUserId, tshirtsController.deleteTshirt)


module.exports = router