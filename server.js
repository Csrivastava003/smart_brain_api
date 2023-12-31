const express=require('express');
const bodyParser = require('body-parser');
const bcrypt=require('bcrypt-nodejs');
const cors=require('cors');
const db = require('knex')({
        client: 'pg',
        connection: {
        connectionString: process.env.DATABASE_URL,
        ssl:{rejectUnauthorized: false},
        host : process.env.DATABASE_HOST,
        port : 5432,
        user : process.env.DATABASE_USER,
        password : process.env.DATABASE_PW,
        database : process.env.DATABASE_DB
    }
    });


const app=express();

app.use(bodyParser.json());
app.use(cors());

app.get('/',(req,res)=>
{
    res.send('success');
})



app.post('/signin',(req,res)=>{
    const {email,password}=req.body;
    if(!email || !password) {
        return res.status(400).json('incorrect form submission')
    }
    db.select('email','hash').from('login')
    .where('email', '=' ,email)
    .then(data=>
        {
            const isValid=bcrypt.compareSync(password,data[0].hash);
            if(isValid)
            {
                return db.select('*').from('users')
                .where('email','=',email)
                .then(user=>{
                    res.json(user[0])
                })
                .catch(err=> res.status(400).json('unable to get user'))
            }
            else{
                res.status(400).json('wrong credentials')
            }
        }).catch(err=> res.status(400).json('wrong credentials'))
})


app.post('/register',(req,res)=>
{
    const {email,name,password}=req.body;
    if(!email || !name || !password) {
        return res.status(400).json('incorrect form submission')
    }
    var hash=bcrypt.hashSync(password);
    db.transaction(trx=>
        {
            trx.insert({
                hash:hash,
                email:email
            }).into('login')
            .returning('email')
            .then(loginEmail=> {
                return db('users').
                returning('*')
                .insert({
                    email:loginEmail[0].email,
                    name:name,
                    joined:new Date()
                })
                .then(user=>
                    {
                        res.json(user[0]);
                    })
                    })
                    .then(trx.commit)
                    .catch(trx.rollback)
        }).catch(err=>res.status(400).json('unable to register')) 
})

app.get('/profile/:id',(req,res)=>{
    const {id}=req.params;
    db.select('*').from('users').where({
        id:id
    }).then(user=>
        {
            if(user.length)
            {
                res.json(user[0]);
            }
            else{
                res.status(400).json('Not Found')
            }
        })
})

app.put('/image',(req,res)=>{
    const {id}=req.body;
    db('users').where('id','=',id).
    increment('entries',1)
    .returning('entries').
    then(entries=>{
        res.json(entries[0].entries);
    }).catch(err=>res.status(400).json('unable to get entries'))
})




// Load hash from your password DB.



app.listen(3000,()=>
{
    console.log('app is running on port 3000');
})


