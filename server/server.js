require('dotenv').config();

const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb')


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(cors({
    origin: 'http://localhost:5173'
}))

// for multer
const storage1 = multer.diskStorage({
    destination: (req, file, callback)=>{
        callback(null, "../client/public/blogImages")
    },
    filename: (req, file, callback)=>{
        console.log(file);
        let arr = file.originalname.split(".");
        if(!fs.existsSync(path.join("../client/public/blogImages/", file.originalname))){
            return callback(null, file.originalname)
        }
        
        else{
            for(;;){
                arr[0] = `${arr[0]}(1)`;
                if(fs.existsSync(path.join("../client/public/blogImages/", `${arr[0]}.${arr[1]}`))){
                continue;
                }else{
              return callback(null, `${arr[0]}.${arr[1]}`);
                }
            }
        }
        
       
    }
})

const storage2 = multer.diskStorage({
    destination: (req, file, callback)=>{
        callback(null, "../client/public/userImages")
    },
    filename: (req, file, callback)=>{
        console.log(file);
        let arr = file.originalname.split(".");
        if(!fs.existsSync(path.join("../client/public/userImages/", file.originalname))){
            return callback(null, file.originalname)
        }
        
        else{
            for(;;){
                arr[0] = `${arr[0]}(1)`;
                if(fs.existsSync(path.join("../client/public/userImages/", `${arr[0]}.${arr[1]}`))){
                continue;
                }else{
              return callback(null, `${arr[0]}.${arr[1]}`);
                }
            }
        }
        
       
    }
})

const upload = multer({storage: storage1});
const uploadProfile = multer({storage: storage2});


const { connectToDb, getDb } = require('./db');

const port = 7500;

app.get('/', (req, res)=>{
    res.send({test: "ok"});
})




let db;
connectToDb((err)=>{
    if(!err){
        app.listen(port, (err)=>{
            if(err) console.log(err);
            console.log(`listening to server at http://localhost:${port}`);
        })
        db = getDb();
    }
})


//used to fetch users from db
app.get('/users', (req, res)=>{
    let array = [];
    db.collection('users')
    .find({})
    .forEach((user)=> array.push(user))
    .then(()=>{
        res.send(array);
    })
})

app.get('/user/:username', (req, res)=>{
    db.collection('users')
    .findOne({username: req.params.username})
    .then((result)=>{
        res.send({result})
    })
})


//used to submit and check a user's registration info
app.post('/auth/register', (req, res)=>{

    console.log("registration running")
    let regInfo = {
        email: "",
        username: "",
        password: ""
    };
  
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {
            regInfo.email = req.body.email;
            regInfo.username = req.body.username;
            regInfo.password = hash;

            console.log(regInfo);
      
            //add to db
            db.collection('users')
           .insertOne(regInfo)
           .then(()=>{
            console.log("info added successfully")
    })


        });
    });
  


    
    res.end();
})

app.post('/addMember', (req, res)=> {
    try{

        console.log("addMember is running")
        const { name, email, dob, placeOfResidence, phoneNumber} = req.body
    const memberInfo = {
        name,
        email,
        dateOfBirth: dob,
        placeOfResidence,
        phoneNumber
    }
 
        db.collection('members')
        .insertOne(memberInfo)
        .then((data)=>{
         console.log("member info added successfully: data", data)
         res.sendStatus(200)
 })

    }
    catch(err) {
        console.log("failed to add member")
        throw new Error("Failed to add member")
    }
})

app.post('/getMember/:id', (req, res)=> {
    try{

        console.log("addMember is running")
      const id = req.params.id;
 
        db.collection('members')
        .findOne({_id: ObjectId(id)})
        .then((data)=>{
         console.log("member info added successfully: data", data)
         res.json(data)
 })

    }
    catch(err) {
        console.log("failed to add member")
        throw new Error("Failed to add member")
    }
})


app.post('/assignParents/:memberId/:motherId/:fatherId', (req, res)=> {
    try{

        const { memberId, motherId, fatherId } = req.params
        console.log("assignParent is running")
        
        db.collection('members')
        .update({_id: memberId}, {$set : {motherId,fatherId}})
        .then(()=>{
         console.log('parents assigned successfully')
        })
        .catch((err)=>{
            if(err) console.log(err)
            console.log('problem changing profile pic')
        res.sendStatus(200)
        })

    }
    catch(err) {
        console.log("failed to add member")
        throw new Error("Failed to add member")
    }
})

app.post('/auth/login', (req, res)=>{
    console.log(req.body);
    //authenticate user
    
db.collection('users')
.findOne({username: req.body.username})
.then(async (result)=>{

    if(result === null){
console.log('item not found in db');
res.end();

    }else{

            let passwordIsCorrect = await bcrypt.compare(req.body.password, result.password);
           if(passwordIsCorrect === true){
            const username = req.body.username;
            const user = {name: username}
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
            // const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
            res.json({accessToken: accessToken
                // , 
                // refreshToken: refreshToken
            });

           }
    }
})



    
})



app.post('/getMembers', (req, res) =>{
    try{
        let arr = [];

        db.collection('parents')
        .find({})
        .forEach((parent)=> {

            db.collection('members')
            .find({parentId: parent._id})
            .then((result)=>{
                const obj= {
                    parent,
                    children: [...result]
                }
                arr.push(obj)
            })
            
        })
        .then(()=>{
            console.log('get comments arr', arr)
            res.send(arr);
        })
        .catch((err)=>{
            if(err) console.log(err);
            console.log('something went wrong while getting comments');
            res.end();
        })

    }catch(err) {
        throw new Error("Failed to get members")
    }
})


// function generateAccessToken(user){
//     return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '15s'})
// }


function authenticateToken(req, res, next){
    // console.log('authheader: ', req)
   const authHeader = req.headers['authorization'];
   const token = authHeader && authHeader.split(' ')[1];
   console.log('token: ', token);
   if(token == null) return res.sendStatus(401);

   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user)=>{
    if(err) {
        console.log(err);
        return res.sendStatus(403 )
    }
    req.user = user;
    next();
   })
}


//route for dashbaord

app.get('/blogs', authenticateToken, (req, res)=>{
    
    let array = [];
    db.collection('blogs')
    .find({})
    .forEach((user)=> array.push(user))
    .then(()=>{
        res.send(array);
    })
})

app.get('/blogs/:id', authenticateToken, (req, res)=>{

    db.collection('blogs')
    .findOne({_id: ObjectId(req.params.id)})
    .then((result)=>{
        res.send(result);
    })
})

// app.post('/create-new-blog', (req, res)=>{

    

// })



//route to upload blog image
app.post('/upload-blog-images', upload.single('file') , (req, res)=>{
    try {
        res.send(req.file);
      } catch (error) {
        console.log(error);
        res.send(400);
      }
    
})

//route to create new blog
app.post('/create-blog', upload.single('file'), (req, res)=>{
    console.log('file',req.file)
   console.log('others', req.body);

   const submitObj = {
        title: req.body.title,
        mainPhotoPath: '/blogImages',
        mainPhotoName: req.file.filename,
        category: req.body.category,
        content: req.body.content,
        author: req.body.author,
        milliseconds: Number(req.body.milliseconds),
        seconds: Number(req.body.seconds), 
        minutes: Number(req.body.minutes),
        hours: Number(req.body.hours),
        day: Number(req.body.day),
        month: Number(req.body.month),
        year: Number(req.body.year),
        createdSlashDate: req.body.createdSlashDate,
        createdDashDate: req.body.createdDashDate,
        createdTime: req.body.createdTime,
        likes: 0,
        dislikes: 0,
        likesArr: [],
        dislikesArr: []
      }

   db.collection('blogs')
   .insertOne(submitObj)
   .then(()=>{
    console.log("info added successfully");
})
   res.end();
})


//change profile picture in navbar
app.post('/change-profile-picture', uploadProfile.single('file'), (req, res)=>{
        // console.log('profile pic path', req.file, req.body.username);

        db.collection('users')
    .findOne({username: req.body.username})
    .then((result)=>{
        if(result.profilePicName !== null){
         fs.unlink(`${result.profilePicDest}/${result.profilePicName}`, err=>{
            if(err) console.log(err);
            console.log(`${req.body.username}'s profile pic was deleted from server`);
            
         })
        }

        db.collection('users')
        .update({_id: result._id}, {$set : {profilePicName: req.file.filename, profilePicPath: `/userImages/${req.file.originalname}`, profilePicDest: req.file.destination}})
        .then(()=>{
         console.log('profile pic set successfully')
        })
        .catch((err)=>{
            if(err) console.log(err)
            console.log('problem changing profile pic')
        })
    })
    .catch(err=>{
        if(err) console.log(err);
        console.log('problem when checking if username is in db for profile pic')
    })


        res.end();
})


//post comment
app.post('/post-comment', (req, res)=>{
    console.log('post comment route',req.body);

    let submitObj = {
        comment: req.body.comment,
        commenter: req.body.commenter,
        blogId: req.body.blogId
    }

    db.collection('comments')
   .insertOne(submitObj)
   .then(()=>{
    console.log("comment added successfully");
})
.catch((err)=>{
    if(err) console.log(err);
    console.log('something went wrong while trying to post comment');
})
    res.end();
})



//get comments by blog id
app.get('/get-comments-by-blog/:id', (req, res)=>{
    let arr = [];
    let blogId = req.params.id;
    console.log('get comment route', blogId);


    db.collection('comments')
    .find({blogId: blogId})
    .forEach((comment)=> arr.push(comment))
    .then(()=>{
        console.log('get comments arr', arr)
        res.send(arr);
    })
    .catch((err)=>{
        if(err) console.log(err);
        console.log('something went wrong while getting comments');
        res.end();
    })
    
})



//route to edit likes and dislikes arrays
app.post('/edit-likes-and-dislikes/:id', (req, res)=>{
    console.log('editing likes and dislikes', req.body);


    db.collection('blogs')
    .update({_id: ObjectId(req.params.id)},{ $set: {likes: req.body.likes, dislikes: req.body.dislikes, likesArr: req.body.likesArr, dislikesArr: req.body.dislikesArr}})
    res.end();
})

//route to delete blog blog

app.delete('/delete-blog/:id', (req, res)=>{
    console.log(req.params.id);
    db.collection('blogs')
    .findOne({_id: ObjectId(req.params.id)})
    .then(result =>{
      fs.unlink(`../client/public/blogImages/${result.mainPhotoName}`, (err)=>{//delete file from server
        if(err) console.log(err);
        console.log('blog image deleted from server');
        //delete file info from database
        db.collection('blogs')
        .deleteOne({_id: ObjectId(req.params.id)})
        .then(result=>{
          console.log('file deleted from database successfully');
         
        })
        .catch(err=>{
          if(err) throw err;
          res.json({err: "blog not found!"})
        })
      })
    })
  })



//route to edit blog