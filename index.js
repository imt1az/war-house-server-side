const express = require("express");
const cors = require("cors");
const { ObjectId } = require("mongodb");
var MongoClient = require("mongodb").MongoClient;
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
const jwt = require('jsonwebtoken');

// MiddleWare
app.use(cors());
app.use(express.json());

function verifyJWT(req,res,next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message:'Unauthorized access'})
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(403).send({message:'Forbidden access'})
    }
    console.log('Decoded',decoded);
    req.decoded = decoded;
    next();
  })
  // console.log('Inside Verify Jwt',authHeader);
 
}

var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-shard-00-00.ziovi.mongodb.net:27017,cluster0-shard-00-01.ziovi.mongodb.net:27017,cluster0-shard-00-02.ziovi.mongodb.net:27017/myFirstDatabase?ssl=true&replicaSet=atlas-14jc8v-shard-0&authSource=admin&retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    const ProductCollection = client.db("All").collection("items");


    // AUTH
    app.post('/login',async(req,res)=>{
      const user =req.body;
      const accessToken = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:'1d'
      });
      res.send({accessToken})
    })

    // sERVER aPI
    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = ProductCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await ProductCollection.insertOne(product);
      res.send(result);
    });

    app.get('/inventory/:id',async(req,res)=>{
        const id =req.params.id;
        const query = {_id:ObjectId(id)};
        const product = await ProductCollection.findOne(query);
        res.send(product);
    })

    // Manage Products
    app.get('/manageProducts',verifyJWT, async(req,res)=>{
        
         const decodedEmail = req.decoded.email;
        const email = req.query.email;

        if(email===decodedEmail){
          const query = {email:email}
        const cursor = ProductCollection.find(query);
        const products = await cursor.toArray();
        res.send(products);
        }
        else{
          res.status(403).send({message:'Forbidden access'})
        }
    })

    // Update Product
    app.put('/inventory/:id',async(req,res)=>{
        const id =req.params.id;
        const updateProduct = req.body;
        const filter = {_id:ObjectId(id)};
        const options = { upsert: true };

        const updateDoc = {
            $set: {
                quantity: updateProduct.quantity
            },
          };
          const result = await ProductCollection.updateOne(filter, updateDoc, options);
          res.send(result);
    })
    //Delete
    app.delete('/inventory/:id',async(req,res)=>{
        const id = req.params.id;
      const query = {_id:ObjectId(id)}
      const result = await ProductCollection.deleteOne(query);
      res.send(result);
    })


  } 
  finally {
  }
}

run().catch(console.dir);
app.get('/',(req,res)=>{
  res.send('Running War House');
})

app.listen(port, () => console.log("Listening from", port));
