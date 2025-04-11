const express = require("express")
const authRoutes = require('./routes/authRoutes');
const tshirtsRoutes = require('./routes/tshirtsRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express()
const port = 3000


app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/tshirts', tshirtsRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/order', orderRoutes)





app.listen(port, async () => {
  console.log(`Server running on port ${port}`)
})
