const express = require('express');
const fs = require('fs')
const csv = require('fast-csv')
const app = express();
const multer = require('multer')
const dotenv = require('dotenv')
require("dotenv").config();
const usermodel = require('./db')
const bodyParser = require('body-parser')
const nodemailer = require('nodemailer');
const cors = require('cors')
app.use(cors());
app.use(bodyParser.json())
app.listen(5000);
console.log('connected')
//multer

const storage = multer.diskStorage({
    destination(req,file,cb){
        cb(null,'./uploads')
    },
    filename(req,file,cb){
        cb(null, `image-${Date.now()}.${file.originalname}`)
    }
})
const isImage = (req,file,cb)=>{
    if(file.mimetype.startsWith("image")){
        cb(null,true)
    }else{
        cb(null,false)
    }
}
const upload = multer({
    storage:storage,
    fileFilter:isImage,
})


//email config
const transporter =  nodemailer.createTransport({
    host:"smtp.gmail.com",
    service:"gmail",
    port:Number(587),
    secure:Boolean(true),
    auth:{
        user:process.env.USER,
        pass:process.env.PASS
    }
})
app.use("/uploads",express.static("./uploads"));
app.use('/files',express.static("./public/files"))
app.post('/signup',upload.single('photo'),async(req,res)=>{
    try{
        const {filename} = req.file;
        const {fname,lname,mobile,gender,status,location,email} = req.body;
        if(!fname || !lname || !mobile ||!gender || !status || !location || !email){
            return res.status(401).json("No data!");
        }else{
            const saved = await new usermodel({fname,lname,mobile,gender,location,email,status,photo:filename}).save();
            console.log(saved);
            res.status(201).json("success")
        }
    }catch(e){
        console.log(e)
        res.status(401).json(e)
    }
})

// app.get("/find",async(req,res)=>{
//     try{
//         const find  = await usermodel.find({});
//         console.log(find);
//         res.status(201).json(find);
//     }catch(e){
//         console.log(e)
//         res.status(401).json(e);
//     }
// })

app.get("/:id",async(req,res)=>{
    try{
    const {id} = req.params;
    const data = await usermodel.findById({_id:id})
    res.status(201).send(data);
    }catch(e){
        console.log(e);
        res.status(401).json(e);
    }
})
app.put('/update/:id',upload.single('photo'),async(req,res)=>{
    try{
        const {fname,lname,mobile,gender,status,location,email,userprofile} = req.body;
        const {id} = req.params;
        const file = req.file?req.file.filename:userprofile
        //const dateUpdated = moment(new Date()).format("YYYY-MM-DD hh:mm:ss");
        const update = await usermodel.findByIdAndUpdate({_id:id},{
            fname,lname,mobile,gender,status,location,email,photo:file
        },{new:true})
        res.status(201).json("data updated")
    }catch(e){
        console.log(e);
        res.status(401).json(e);
    }
})

app.delete('/del/:id',async(req,res)=>{
    try{
        const {id} = req.params;
        console.log(id);
        const del = await usermodel.findByIdAndDelete({_id:id})
        console.log(del);
        res.status(201).json("success")
    }catch(e){
        console.log(e)
        res.status(401).json(e)
    }
})

app.get('/find/search',async(req,res)=>{
    try{
        const {search,gender,status,sort} = req.query;
        const page = req.query.page || 1
        const item_per_page =  2;
        const skip = (page-1) * item_per_page
        const count = await usermodel.countDocuments();
        const pageCount = Math.ceil(count/item_per_page);

        const query = {
            fname:{$regex:search,$options:"i"},
        }
        if(gender !== "all"){
            query.gender = gender;
        }
        if(status !== "all"){
            query.status=status;
        }
            const userdata = await usermodel.find(query).sort({date:sort==="new"?-1:1}).limit(item_per_page).skip(skip);
            res.status(201).json({
                Pagination:{
                    count,pageCount
                },
                userdata
            });
        }
        
    catch(e){
        console.log(e);
        res.status(401).json(e);
    }
})
app.get('/findit/find',async(req,res)=>{
    try {
        const usersdata = await usermodel.find({});
        const csvStream = csv.format({ headers: true });

        if (!fs.existsSync("public/files/export/")) {
            if (!fs.existsSync("public/files")) {
                fs.mkdirSync("public/files/");
            }
            if (!fs.existsSync("public/files/export")) {
                fs.mkdirSync("./public/files/export/");
            }
        }

        const writablestream = fs.createWriteStream(
            "public/files/export/users.csv"
        );

        csvStream.pipe(writablestream);

        writablestream.on("finish", function () {
            res.json({
                downloadUrl: 'http://localhost:5000/files/export/users.csv',
            });
        });
        if (usersdata.length > 0) {
            usersdata.map((user) => {
                csvStream.write({
                    FirstName: user.fname ? user.fname : "-",
                    LastName: user.lname ? user.lname : "-",
                    Email: user.email ? user.email : "-",
                    Phone: user.mobile ? user.mobile : "-",
                    Gender: user.gender ? user.gender : "-",
                    Status: user.status ? user.status : "-",
                    Profile: user.photo ? user.photo : "-",
                    Location: user.location ? user.location : "-",
                })
            })
        }
        csvStream.end();
        writablestream.end();

    } catch (error) {
        res.status(401).json(error)
    }
})
app.put('/updates/:id',async(req,res)=>{
    try{
        const {id} = req.params;
        const {sta} = req.body;
        const update =  await usermodel.findByIdAndUpdate({_id:id},{status:sta},{new:true});
        console.log(update)
        res.status(201).json("success")
    }catch(e){
        res.status(401).json(e)
    }
})


//sending email
app.post('/loginotp',async(req,res)=>{
    try{
        const {email} = req.body;
        if(!email){
            console.log("no email");
            return res.status(401).json("no email");
        }else{
            const check = await usermodel.findOne({email:email});
            if(check){
                const OTP = Math.floor(1000000+Math.random()*9000000);
                const existsEmail = await usermodel.findOne({email:email});
                if(existsEmail){
                    const updateData  = await usermodel.findByIdAndUpdate({_id:existsEmail._id},{otp:OTP},{new:true});
                    console.log("part1 running")
                    await updateData.save();
                    const mailOptions = {
                        from : "myheldesk99@gmail.com",
                        to:email,
                        subject: "Your otp",
                        text:`OTP: ${OTP}`
                    }
                    transporter.sendMail(mailOptions,(err,info)=>{
                        if(err){
                            console.log(err);
                            res.status(401).json(err)
                        }else{
                            console.log("email sent")
                            res.status(201).json("email sent")
                        }
                    })
                }else{
                    const saveOtp = new usermodel({email,otp:OTP});
                    console.log("part2 running")
                    await saveOtp.save();
                    const mailOptions = {
                        from : process.env.USER,
                        to:email,
                        subject: "Your otp",
                        text:`OTP: ${OTP}`
                    }
                    transporter.sendMail(mailOptions,(err,info)=>{
                        if(err){
                            console.log(err);
                            res.status(401).json(err)
                        }else{
                            console.log("email sent")
                            res.status(201).json("email sent")
                        }
                    })
                }
            }else{
                return res.status(401).json("error");
            }
        }
    }catch(e){
        console.log(e);
        res.status(401).json(e)
    }
})


app.post('/sendotp',async(req,res)=>{
    try{
        const {otp,email} = req.body;
        if(!otp){
            return res.status(401).json(e);
        }else{
            const checkemail = await usermodel.findOne({email:email});
            if(checkemail){
                if(checkemail.otp===req.body.otp){
                    return res.status(201).json("success")
                }else{
                    return res.status(401).json("inavalid otp")
                }
            }else{
                return res.status(401).json("inavalid")
            }
        }
    }catch(e){
        console.log(e)
        res.status(401).json(e)
    }
})