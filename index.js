const express = require('express')
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_username}:${process.env.DB_password}@cluster0.dfsqs.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    await client.connect();
    const partsCollection = client.db("manufacturer-website").collection("manufacturer-parts");
    const purchaseCollection = client.db("manufacturer-website").collection("manufacturer-purchase");
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
      console.log("id from backend:", id);
      const filter = {_id: ObjectId(id)};
      const item = await partsCollection.findOne(filter)
      res.send(item)
    })

    // function = purchase page e item insert korbo 
    // step1:req te jei object ta pathano hoise tar id ta diye search koro j database e ase kina
    // na thakele insert korbo, thakle ager quantity er sathe new quantity add korbo
    app.put("/purchase", async(req, res) =>{
      const item = req.body;
      
      const {purchedId, purchedQuantity} = item;
      const query = {purchedId: purchedId};
      
      console.log("query:", query)
      
      const existingItem =await purchaseCollection.findOne(query);
      console.log("existingItem:", existingItem)
      if (existingItem){
        const quantity = parseInt(existingItem.purchedQuantity) + parseInt(purchedQuantity);
        const updateDocument = {
          $set:{
            quantity : quantity
          }
        }
        console.log("in if clause")
        const result =await purchaseCollection.updateOne(query, updateDocument);
        res.send(result)
      }
      else{
        console.log("in else")
        const result = await purchaseCollection.insertOne(item);
        res.send(result);
      }
      
      
     
      

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