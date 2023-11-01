import express from "express";

const app = express();

app.get("/", (req , res) => {
    res.send("Heyo");
})

app.listen(3000, ()=> {
    console.log("Brrrrr");
})