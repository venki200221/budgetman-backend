const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt-nodejs');

const app = express();
const db = knex({
    client: 'pg',
    connection: {
      connectionString : process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
});

app.use(bodyParser.json());
app.use(cors())

app.get('/',(req,res) => res.send('It is working!'))

app.post('/register',(req, res) => {
    const {userid, name, email, password} = req.body
    if(!userid || !email || !password){
        res.status(400).json("Unable to register!")
    }
    const hash = bcrypt.hashSync(password)
    db.transaction(trx=>{
        trx.insert({
            hash: hash,
            email: email,
            id: userid
        })
        .into('login')
        .returning('email')
        .then(loginEmail=>{
            return db('users')
            .returning('*')
            .insert({
                id: userid,
                email: loginEmail[0],
                name: name,
                joined: new Date()
            })
            .then(user=>{
                res.json(user[0])
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err=>res.status(400).json(err))
})

app.post('/signin', (req, res) => {
    const {email, password} = req.body
    if(!email || !password){
        res.status(400).json("Incorrect information")
    }
    db.select('email','hash').from('login')
    .where('email','=',email)
    .then(data => {
        const isValid = bcrypt.compareSync(password,data[0].hash)
        if(isValid){
            return db.select('*').from('users')
            .where('email','=', email)
            .then(user => {
                res.json(user[0]);
            })
            .catch(err => res.status(400).json('unable to find the user!'))
        }
        else{
            res.status(400).json('failure')
        }
    })
    .catch(err => res.status(400).json('unable to signin!'))
})

app.post('/budget', (req, res) => {
    const {userid, name, income, exp, tags} = req.body;
    if(!name || !income){
        res.status(400).json("Unable to save :(")
    }
    db('budgets').insert({
        user_id: userid,
        name: name,
        income: income,
        expenditure: Number(exp),
        tags: JSON.stringify(tags)
    })
    .then(console.log)
    return db.select('*').from('budgets')
    .where('user_id','=',userid)
    .then(budget=>{
        res.json(budget)
    })
    .catch(err=>res.status(400).json('unable to find the budget!'))
})

app.get('/dashboard/:id', (req,res) => {
    const {id} = req.params
    db.select('*').from('budgets')
    .where('user_id','=',id)
    .then(budget=>{
        res.json(budget)
    })
    .catch(err=>res.status(400).json('unable to find the budget!'))
})

app.get('/dashboard/:iduser/:id', (req,res) => {
    const {iduser} = req.params
    const {id} = req.params
    db.select('*').from('budgets')
    .where('user_id','=',iduser)
    .andWhere('budget_id','=',id)
    .then(budget => {
        res.json(budget[0])
    })
    .catch(err => res.status(400).json('No record found'))
})

app.delete('/dashboard/:iduser/:id',(req,res) => {
    const {iduser} = req.params
    const {id} = req.params
    db('budgets')
    .where('user_id','=',iduser)
    .andWhere('budget_id','=',id)
    .del()
    .then(rows => {
        if (!rows){
            return res.status(404).json({success:false});
          }
          return res.json({success:true});
    })
    .catch(err => res.status(400).json('unable to delete!'))
})

app.put('/dashboard/:iduser/:id', (req,res) => {
    const {iduser} = req.params
    const {id} = req.params
    const {name, income, exp, tags} = req.body
    db('budgets')
    .where('user_id','=',iduser)
    .andWhere('budget_id','=',id)
    .update({
        name: name,
        income: income,
        expenditure: exp,
        tags: JSON.stringify(tags)
    })
    .then(rows => {
        if (!rows){
            return res.status(404).json({success:false});
          }
          return res.json({success:true});
    })
})

app.get('/profile/:id', (req,res) => {
    const {id} = req.params
    db.select('*').from('budgets')
    .where('user_id','=',id)
    .then(user => {
        res.json(user)
    })
    .catch(err => res.status(400).json('user not found'))
})

app.listen(process.env.PORT,()=>{
    console.log(`server is running in ${process.env.PORT}`);
})