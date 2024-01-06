const express = require('express');
const mainRouter = require('./routes/main');
const cookieParser = require('cookie-parser');
const path = require('path');
const methodOverride = require('method-override');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname,'..','public')))

app.set('view engine', 'ejs');
app.set('views', 'src/views');


app.use('/', mainRouter);


app.listen(3000, () => {
  console.log('listening in http://localhost:3000');
});
