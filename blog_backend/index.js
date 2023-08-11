//Initially for Login and Sign up pages 
const express = require('express');

const app = express();

app.use(express.json());
const cors = require('cors');
app.use(cors());
const {Database} = require('sqlite3');
const {open} = require('sqlite');

const path = require('path');
const dbPath = path.join(__dirname,"blogDatabase.db");

let db = null;

const bcrpyt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { off } = require('process');

const initializeDBAndServer = async() => {
    try {
    db = await open({filename:dbPath,driver:Database})
    app.listen(4000, () => {
        console.log('Server is running at port 4000');
    })
}
catch(e){
    console.log(`DB Error ${e.message}`);
    process.exit(1);
}
}

initializeDBAndServer();

//Middleware Function 

const authenticateToken = async(request,response,next) => {

    let authHeader = request.headers['authorization'];
    
    if (authHeader === undefined){
        response.status(401);
        response.json({message:'Invalid JWT Token'})
        
    }
    else{
        const jwtToken = authHeader.split(' ')[1];

        if (jwtToken === undefined) {
            
            response.status(401);
            response.json({message:'Invalid JWT Token'})
        }
        else{
            jwt.verify(jwtToken,'MY_SECRET_KEY', async(error,payload) => {
        
                if(error){
                    response.status(401);
                    response.json({message:'Invalid JWT Token'})
                    
                }else{
                    
                    request.username = payload.username;
                    next();
                }
            })
            
        }
    }

}

//REGISTERING USER 

app.post("/signup/", async(request,response) => {
    const {name,username,password,gender} = request.body;
    
    try {
    const HashedPassword = await bcrpyt.hash(password,10);

    const getUserQuery = `SELECT username FROM user WHERE username = '${username}';`;

    const dbUserName = await db.get(getUserQuery);

    if (dbUserName) {
        response.status(401);
        
        response.json({message:"Username Already Exists"});
    }
    else{
        const createUserQuery = `INSERT INTO user(name, username,gender,password) 
        VALUES('${name}','${username}','${gender}','${HashedPassword}')`;

        await db.run(createUserQuery);

        response.json({message:"User Created Successfully"});
    }
}catch(e){
    response.status(401);
    response.json({message:'Unable to Sign Up, please try Again'});
}
})

//LOGGING IN USER
app.post('/login', async(request,response) => {

    const {username,password} = request.body;

    try {

    const userExistsQuery = `SELECT username,password FROM user WHERE username = '${username}';`;

    const dbUserName = await db.get(userExistsQuery);
    

    if (dbUserName){
        const jwtToken = jwt.sign({username:username},'MY_SECRET_KEY');
        const isPasswordMatched = await bcrpyt.compare(password,dbUserName.password);
        if (isPasswordMatched){
            response.json({jwtToken});
        }
        else{
            response.status(401);
        response.json({message:"Wrong Password"});
        }
    }
    else{

        response.status(401);
        response.send({message:"User Name doesn't exist"});
        
    }
}catch(e){
    response.status(401);
    response.send({message:'Unable to Login, please try again'})
}

})

//GET USER NAME & NAME 

app.get("/getUserDetails", authenticateToken,async(request,response) => {

    const {username} = request;

    const getNameQuery = `SELECT name FROM user WHERE username = '${username}';`;
    
    const name = await db.get(getNameQuery);
    response.json({username,name})
})

//CREATE BLOG 

app.post('/createblog/', authenticateToken, async(request,response) => {
    const {username} = request;
    const {title,content} = request.body;
    
    try {
    const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}';`;

    const userId = await db.get(getUserIdQuery);

    const addBlogQuery = `INSERT INTO blogs(user_id,title,content) VALUES(${userId.user_id},"${title}",'${content}');`;
    
    try {    
        await db.run(addBlogQuery);
        response.json({message:"Blog Created!"});
    }catch(e){
        response.status(401).json({message:e.message});
        console.log(e.message);
    }
    }
    catch(e){
        response.status(401).json({message:e.message});
    }
})

// GET TITLES  AND blog id 

app.get('/getblogtitles', authenticateToken,async(request,response ) =>{
    
    let {limit,offset} = request.query;
    limit = parseInt(limit);
    offset = parseInt(offset);

    try {
        let getTitlesQuery = `SELECT blog_id as blogId, title FROM blogs LIMIT ${limit} OFFSET ${offset};`;
        
        const titlesArray = await db.all(getTitlesQuery);

        response.json({titlesArray});
    }
    catch(e){
        console.log(e.message);
        response.status(404).json({message:'Nothing to Show'});
    }
})

//GET SPECIFIC BLOG ITEM

app.get('/getblogdetails/:id',authenticateToken,async(request,response) => {
    
    try{
        let {id} = request.params;
        
        const getBlogQuery = `SELECT blog_id,title,content FROM blogs WHERE blog_id = ${id.slice(1)}`;

        const blogArray = await db.get(getBlogQuery);

        response.json({blogArray});
        
    }
    catch(e){
        response.status(401).json({message:'Unable to get this Article'});
    }
})

// ADD A COMMENT 

app.post("/addcomments", authenticateToken, async(request,response) => {

    const {item,name,comment} = request.body;
    

    try{
        const addCommentQuery = `INSERT INTO comments(blog_id,name,comment) VALUES(${item},'${name}',"${comment}");`;

        await db.run(addCommentQuery);
        response.json({message:'Comment Added'});
        
    }
    catch(e){
        
        response.status(401).json({message:'Unable To Add Comment'});
    }
})

//GET COMMENT COUNT

app.get("/getcommentcount", authenticateToken,async(request,response) => {

    const {blog_id} = request.query;
    console.log(blog_id);
    try{
        const getCommentCountQuery = `SELECT COUNT(*) as comment_count FROM comments WHERE blog_id = ${blog_id};`;

        const data = await db.get(getCommentCountQuery);

        response.json({data});
        console.log("comment",data);
    }
    catch(e){
        response.status(401).json({message:e.message});
    }
})