const express = require('express')
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_username}:${process.env.DB_password}@cluster0.dfsqs.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const verifyJWT = (req, res, next) =>{
  // console.log("in JWT")
  const authHeader = req.headers.authorization;
  console.log("authHeader:", authHeader)
  if(!authHeader){
    return res.status(401).send({message: "unauthorized access"})
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){

    if(err){
      console.log("err:", err)
      return res.status(403).send({message:"forbidden access"})
    }
    req.decoded = decoded;
    next()
  })
}
async function run(){
    await client.connect();
    const partsCollection = client.db("manufacturer-website").collection("manufacturer-parts");
    const purchaseCollection = client.db("manufacturer-website").collection("manufacturer-purchase");
    const reviewCollection = client.db("manufacturer-website").collection("review");
    const myProfile = client.db("manufacturer-website").collection("myProfile");
    const userCollection = client.db("manufacturer-website").collection("users")

    try{
    
// manufacturerParts e mongodb database theke find kore anbo  
    app.get("/manufacturerParts", async(req, res) =>{
        const cursor = partsCollection.find({});
        const manufacturerParts = await cursor.toArray()

        res.send(manufacturerParts)
    })
// ekta specific id er jonno data load korte hobe
// step1:req er parameter theke id ta pabo oi id ta hobe query 
// step2:oi id er object ta response pathabo 
    app.get("/manufacturerParts/:id", async(req, res) =>{
      const {id} = req.params;
      const filter = {_id: ObjectId(id)};
      const item = await partsCollection.findOne(filter)
      res.send(item)
    })

    // delete one product
    app.delete("/manufacturerParts", async(req, res) =>{
      const id = req.body.id;
      console.log("id", id)
      const query = {_id: ObjectId(id)};
      console.log("query:", query)
      const result = await partsCollection.deleteOne(query);
      res.send(result)


    })

    // function = purchase page e item insert korbo 
    // step1:req te jei object ta pathano hoise tar id ta diye search koro j database e ase kina
    // na thakele insert korbo, thakle ager quantity er sathe new quantity add korbo
    app.put("/myOrders", async(req, res) =>{
      const item = req.body;
      
      const {purchedId, purchedQuantity} = item;
      const query = {purchedId: purchedId};
      
      // console.log("query:", query)
      
      const existingItem =await purchaseCollection.findOne(query);
      // console.log("existingItem:", existingItem)
      const filerToGetStockItem = {_id: ObjectId(purchedId)};
      const itemInStock = await partsCollection.findOne(filerToGetStockItem);
      const remainingQuantity = itemInStock.quantity - parseInt(purchedQuantity);
      console.log("remainingQuantity:",remainingQuantity);
      // itemInStock.quantity = remainingQuantity;
      let result;
      if (existingItem){
        const quantity = parseInt(existingItem.purchedQuantity) + parseInt(purchedQuantity);
        const updateDocument = {
          $set:{
            quantity : quantity
          }
        }
        console.log("in if clause")
        result =await purchaseCollection.updateOne(query, updateDocument);
        
      }
      else{
        console.log("in else")
        result = await purchaseCollection.insertOne(item);
        
      }
      const newQuantity = {
        $set:{
          quantity: remainingQuantity
        }
      }
      const itemWithNewQuantity = await partsCollection.updateOne(filerToGetStockItem, newQuantity)
      res.send(result)
    })

    // get myOrders for one invividual user 
    // step1:ekta email address er jonno kotopula purchase item ase ta pathabo
    app.get("/myOrders",verifyJWT, async(req, res) =>{
      const filter = req.query;
      const decodedEmail = req.decoded.email;
      console.log("decodedEmail:", decodedEmail)
      if(filter.buyer === decodedEmail){
        // console.log("filter:", filter)
        const allPurchesed = await purchaseCollection.find(filter).toArray();
        res.send(allPurchesed)
      }
      else{
        res.status(403).send({message:"forebidden"})
      }

    })
    // add a review 
    // step1:req body te jei data pabo ta insert korbo review collection e 
    app.post("/review", async(req, res) =>{
      const review = req.body;
      console.log(review)
      const listOfReview = await reviewCollection.insertOne(review);
      res.send(listOfReview)
    })

    // show all reviews
    app.get("/review", async(req, res) =>{
      const cursor = reviewCollection.find({});
      const allReviews = await cursor.toArray();
      res.send(allReviews)
    })
    // my profile data post that received from client
    app.put("/myProfile", async(req, res) =>{
      const addedInfo = req.body;
      const option = { upsert: true };
      const result = await myProfile.updateOne({}, {$set: addedInfo}, option);
      res.send(result)

    })
    // get the profile
    app.get("/myProfile", async(req, res) =>{
      const result = await myProfile.find({}).toArray();
      res.send(result)
    })
    // get all user list
    app.get("/user", async(req, res) =>{
      const allUser = await userCollection.find({}).toArray();
      res.send(allUser)
    })
    // make a user admin
    app.put("/user/admin/:email",verifyJWT, async(req, res) =>{
      const email = req.params.email;
      console.log("email:", email);
      const filter = {email: email};
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({email: requester});
      if (requesterAccount.role === "admin"){
        const roleAdmin = {
          $set: {role: 'admin'}
        };
        const result = await userCollection.updateOne(filter, roleAdmin);
        res.send(result)
      }
      else(
        res.status(403).send({message:"Forbidden"})
      )
      
    })
    // check if the role is admin
    app.get("/admin/:email", async(req, res) =>{
      const email = req.params.email;
      const person = await userCollection.findOne({email:email});
      const isAdmin = person.role === "admin";
      res.send(isAdmin)
    })
    // add user 
    app.put("/user/:email", async(req, res) =>{
      const email = req.params.email;
      const filter = {email: email};
      const option = {upsert: true};
      const user = req.body
      const updatedItem = {
        $set:
          user
        
      }
      const result = await userCollection.updateOne(filter, updatedItem, option);
      const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
      res.send({result, token})
    })
    }
    finally{

    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})