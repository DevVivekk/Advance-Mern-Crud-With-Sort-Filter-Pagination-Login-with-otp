const mongoose = require("mongoose");
const  validator = require("validator")
const dotenv = require('dotenv')
require("dotenv").config();
mongoose.connect(process.env.MONGO)
.then((res)=>{
    console.log("connected!")
})
.catch((e)=>{
    console.log(e);
})

const userSchema = new mongoose.Schema({
    fname:{
        type:String,
        required:true
    },
    lname:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    mobile:{
        type:Number,
        required:true
    },
    status:{
        type:String,
        required:true
    },
    gender:{
        type:String,
        required:true
    },
    location:{
        type:String,
        required:true
    },
    photo:{
        type:String,
        required:true
    },
    otp:{
        type:String
    },
        date:{
            type:Date,
            default: Date.now()
        },
},{timestamps:true})
    

const usermodel = new mongoose.model('ReactHp',userSchema)
module.exports = usermodel