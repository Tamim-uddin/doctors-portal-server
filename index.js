const express = require('express');
var cors = require('cors');
require('dotenv').config();
const admin = require("firebase-admin");
const { MongoClient } = require('mongodb');


const app = express();
const port = process.env.PORT || 5000;

// doctors-portal-firebase-adminsdk.json

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ww2yo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken (req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];

    try{
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail =decodedUser.email;
    }
    catch{

    }
  }

  next();
}


async function run(){
    try {
        await client.connect();
        
        
        const database = client.db('doctors_portal');
        const appointmentsCollection = database.collection('appointments');
        const usersCollection = database.collection('users');

      // sob gula apoointmnt theke email $ date filter kore client site e dekhano
      app.get('/appointments', async(req, res) => {
        const email = req.query.email;
        const date = req.query.date;
        console.log(date);
        const query = {email: email, date: date };
        const cursor = appointmentsCollection.find(query);
        const appointments = await cursor.toArray();
        res.json(appointments);
      })

      // sob gula appoinmnt re database e pathano
      app.post('/appointments', async(req, res) => {
        const appointment = req.body;
        const result = await appointmentsCollection.insertOne(appointment);
        console.log(result);
        res.json(result);
      });

      // sb gula users ke database e pathano || register er maddome jara dukbe
      app.post('/users', async(req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        console.log(result);
        res.json(result);
      });

      // google sign in diye jara dukbe tader ke database e pathano || jara age theke thkbe tader ke notun kre add krbe na
      app.put('/users', async(req, res) => {
        const user = req.body;
        const filter = {email: user.email};
        const options = { upsert: true };
        const updateDoc = {$set: user };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result);
      });

      // admin bananor jonno || orthat database e oinuser er nice role=admin asbe
      app.put('/users/admin', verifyToken, async(req, res) => {
        const user = req.body;
        const requester = req.decodedEmail;
        if(requester){
          const requesterAccount = await usersCollection.findOne({email: requester});
       
        if(requesterAccount.role === 'admin'){
          const filter = {email: user.adminemail};
          const updateDoc = {$set: {role: 'admin'}};
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      }
      else{
        res.status(403).json({message: 'you have not access to make admin'})
      }
        
      });

      // admin ke secure korar jonnno|| user ta admin kina ta databse thke niye client site e pathabe
      app.get('/users/:email', async(req, res) => {
        const email = req.params.email;
        console.log(email);
        const query = {email: email};
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if(user?.role === 'admin'){
          isAdmin = true;
        }
        res.json({admin: isAdmin})
      })

    }
    finally{
        // await client.close()
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello DOctors Portal')
})

app.listen(port, () => {
  console.log(` listening at ${port}`)
})