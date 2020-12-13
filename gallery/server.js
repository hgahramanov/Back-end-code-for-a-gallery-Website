//getting the necessary tools:
const express = require("express")
const multer = require("multer")
const mysql = require("mysql")
const path = require("path")
const bodyParser = require("body-parser")
const dotenv = require("dotenv")
const session = require("express-session")
const fs = require('fs');
const { nextTick } = require("process")

//setting up:
var app = express()
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
dotenv.config({path: "./.env"})

//multer:
var storage = multer.diskStorage({destination: function (req, file, cb) {
    cb(null, path.join(__dirname,'uploads'))
}, 
filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) //Appending extension
  }
})

var storage2 = multer.diskStorage({destination: function (req, file, cb) {
  cb(null, path.join(__dirname,'profile_pics'))
}, 
filename: function (req, file, cb) {
  cb(null, req.params['id'] + path.extname(file.originalname)) //Appending extension
}
})

const upload = multer({storage: storage})

const profpic = multer({storage: storage2})

//connecting to SQL database:
const db = mysql.createConnection({
    host: ,
    user: ,
    password:
  });

//setting up ejs view engine for html rendering: 
app.set('views', path.join(__dirname, 'Public'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Create a session cookie
app.use(
    session({
      secret: "oursecret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        expires: 60000000,
        httpOnly: true,
      }
    })
  );

//handling the requests:


app.get("/admin", (req, res) => {
  if(req.session.authenticated === true){

    res.render("admin")
  }
  else{
    res.redirect('/admin/login')
  }
})

app.post('/admin', upload.single("visual"), (req, res) => {
  if (req.session.authenticated === true){

    if (!req.file) {
      console.log("No file received");
      res.redirect('/admin')
    } 
    else {
      console.log('file received');
      const filename = req.file['filename']
      const {artist, artname, description} = req.body
      console.log(description)
      db.query('INSERT INTO gallery.files SET ?', {artist: artist, artname: artname, filename: filename, description: description}, function(err, result){
        if (err){
          throw err;
        }
        else{
          console.log("submitted")
        }
      })
      db.query('SELECT * FROM gallery.artists WHERE name = ?', [artist], (err, result) => {
          if (err) throw err
          else{
              if(result.length === 0){
                  db.query('INSERT INTO gallery.artists SET ?', {name: artist}, (err) => {
                      if (err) throw err
                  })
              }
          }
      })
      return res.redirect('/admin')
    }
  }
  else{
    res.redirect('/admin/login')
  }
})

app.get('/', (req, res) => {
    res.render("gallery")
})

app.get('/aboutus', (req, res) => {
  res.render('aboutus')
})

app.get('/profile/:name', (req, res) => {
  res.render('artist')
})

app.get('/profiles', (req, res) => {
  res.render('listofartists')
})

//Handling Administrator Authentication:
app.get('/admin/login', (req, res) => {
  res.render('login')
})

app.post("/admin/login", (req, res) => {
  console.log(req.body)
  const {username, passwd} = req.body
  if (username === 'root' && passwd === 'root'){
    req.session.authenticated = true
    res.redirect('/admin')  }
  else{
    res.redirect('/admin/login')
  }
})


//Handling the api:
app.get('/api/data',  (req, res) => {
     db.query('SELECT * FROM gallery.files',  (err, result) => {
        res.send(result)
    })
})

app.get('/api/artists',  (req, res) => {
    db.query('SELECT * FROM gallery.artists',  (err, result) => {
       res.send(result)
   })
})

app.get('/api/artist_works/:name',  (req, res) => {
  console.log('Activated')
  db.query('SELECT * FROM gallery.files WHERE artist = ?', [req.params['name']], (err, result) => {
    console.log(result)
    res.send(result)
 })
})

app.get('/api/artist_profile/:name', (req, res) => {
  db.query('SELECT * FROM gallery.artists WHERE name = ?', [req.params['name']], (err, result) => {
    if (err) throw err
    else res.send(result)
  })
})

app.post('/api/artists/:id', profpic.single('visual'),  (req, res) => {
  if(req.session.authenticated === true){
    id = req.params['id']
    bio = req.body['bio']
    if (req.file){ 
        filename = req.file['filename']
        console.log('image file recieved')
    }
    else{ 
      filename = null
      console.log('not recieved')
    }
    db.query('UPDATE gallery.artists SET ? WHERE id = ?', [{bio: bio, image: filename}, id], (err, result) => {
        if (err) throw err
        else{
            res.redirect('/admin')
        }
    })
  }
  else{
    res.redirect('/')
  }
})

app.get('/api/artists/:filename', (req, res) => {
  filename = req.params['filename']
  res.sendFile(path.join(__dirname, 'profile_pics', filename))
})

app.get('/api/content/:filename', (req, res) => {
    filename = req.params['filename']
    res.sendFile(path.join(__dirname, 'uploads', filename))
})

app.get('/api/delete/:id', (req, res) => {
  if (req.session.authenticated === true){
      id = req.params['id']
      console.log("Deletion of ", id)
      db.query('SELECT filename FROM gallery.files WHERE id = ?', [id], (err, result) => {
        if(err) throw err
        else{
          console.log(result[0]['filename'])
          fs.unlink(path.join(__dirname, 'uploads', result[0]['filename']), (err)=>{
            if (err) throw err
          })
          db.query('DELETE FROM gallery.files WHERE id = ?', [id], (err, result) => {
            if (err) throw err
            else res.redirect('/admin')
          })
      }
    })
  }
  else{
    res.redirect('/')
  }
})

app.get('/api/admin/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/admin/login')
})


app.use('*', (req, res, next) => {
  res.redirect('/')
})

//start the app:
app.listen(5000)