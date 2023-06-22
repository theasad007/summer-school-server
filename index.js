const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

require('dotenv').config();

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded
    next()
  })
}


// Basic Route
app.get('/', (req, res) => {
  res.send('Language School is Running')
})


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.LNAG_SCHOOL_USER}:${process.env.LNAG_SCHOOL_PASS}@cluster0.sbe3ku7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const langUserCollection = client.db('langUsers').collection('users');
    const langClassCollection = client.db('langClasses').collection('classes');
    const selectedCourseCollection = client.db('selectedCourse').collection('courses');


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
      res.send({ token })
    })



    app.get('/classes/home', async (req, res) => {
      const cursor = langClassCollection.find();
      const result = await cursor.limit(6).toArray();
      res.send(result);
    })

    app.get('/classes', async (req, res) => {
      const cursor = langClassCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/classes', async (req, res) => {
      const item = req.body;
      const result = await langClassCollection.insertOne(item);
      res.send(result)
    })

    // Selected COurse
    // Get all
    app.get('/selected', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Access Forbidden' })
      }

      const query = { email: email };
      const result = await selectedCourseCollection.find(query).toArray();
      res.send(result);
    })

    // Save Selected
    app.post('/selected', async (req, res) => {
      const item = req.body;
      const result = await selectedCourseCollection.insertOne(item);
      res.send(result);
    })

    // Delete Selected
    app.delete('/selected/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedCourseCollection.deleteOne(query);
      res.send(result)
    })

    // Users Api
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };
      const existingUser = await langUserCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists' })
      }
      const result = await langUserCollection.insertOne(user);
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const result = await langUserCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/instructors', async (req, res) => {
      const filter = {role: 'instructor'}
      const result = await langUserCollection.find(filter).toArray();
      res.send(result);
    })

    app.get('/users/instructors/home', async (req, res) => {
      const filter = {role: 'instructor'}
      const result = await langUserCollection.find(filter).limit(6).toArray();
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await langUserCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.get('users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.send({ admin: false })
      }

      const query = {email: email};
      const user = await langUserCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result)
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'instructor'
        }
      }
      const result = await langUserCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log('Server is Running on Port', port)
})