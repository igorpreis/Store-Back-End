const { creatUserSchema, loginUserSchema, generateToken } = require("../middleware/middleware")
const db = require("../firebase/firebaseConfig")
const { date } = require("joi")

async function createUser(req, res) {
  const isDuplicate = await db.collection("users").where("email", "==", req.body.email).get()

  if (isDuplicate.docs.length > 0) {
    return res.status(400).json("This email exists in the database.")
  }

  const { full_name, email, password, role } = req.body

  const user = {
    full_name: full_name,
    email: email,
    password: password,
    role: role,
    createdAt: new Date().toISOString(),
  }

  const { error } = creatUserSchema.validate(user)
  if (error) {
    return res.status(400).json(error)
  }

  try {
    const createdUser = await db.collection("users").add(user)

    return res.status(201).json({
      message: "User created successfully",
      userId: createdUser.id,
      user: user,
    })
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create the user in the database.",
      details: error.message,
    })
  }
}

async function login(req, res) {
  const { error } = loginUserSchema.validate(req.body)
  if (error) {
    return res.status(400).json(error)
  }

  const { email } = req.body

  try {
    // Find user by email in the 'users' collection
    const userDoc = await db.collection("users").where("email", "==", email).limit(1).get()

    if (userDoc.empty) {
      return res.status(404).json({ message: "User not found" })
    }

    const user = userDoc.docs[0].data()
    const userRole = user.role
    const userId = userDoc.docs[0].id

    const token = generateToken(userId, userRole)

    res.json({ token })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
}

module.exports = {
  createUser,
  login,
}
