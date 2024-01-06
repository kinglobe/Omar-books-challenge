const bcryptjs = require('bcryptjs');
const db = require('../database/models');
const { Op } = require('sequelize');

const sessionInformation = (req) => {

  if (req.cookies.userEmail) {
    return {
      // obtiene cookies
      email: req.cookies.userEmail,
      name: req.cookies.userName,
      userIsAdmin: req.cookies.userIsAdmin
    }
  } else {
    return {
      email: null,
      name: null,
      userIsAdmin: null
    }
  }
}

const mainController = {
  home: (req, res) => {

    let sessionInfo = sessionInformation(req);

    db.Book.findAll({
      include: [{ association: 'authors' }]
    })
      .then((books) => {
        res.render('home', { books, sessionInformation: sessionInfo });
      })
      .catch((error) => console.log(error));
  },
  bookDetail: async (req, res) => {
    //Implementar la búsqueda de detalles en la base de datos.

    try {
      const book = await db.Book.findByPk(req.params.id, {
        include: [{ association: 'authors' }]
      })

      if (!book) {
        return res.status(404).send('Libro no encontrado');
      }

      let sessionInfo = sessionInformation(req);

      return res.render('bookDetail', {
        book, sessionInformation: sessionInfo
      })

    } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
    }
  },

  bookSearch: (req, res) => {
    res.render('search', { books: [], sessionInformation: sessionInformation(req) });
  },
  bookSearchResult: async (req, res) => {
    try {
      const searchTerm = req.body.title;

      if (!searchTerm) {
        return res.status(400).json({ error: 'El campo de búsqueda está vacío.' });
      }

      const books = await db.Book.findAll({
        where: {
          title: { [Op.like]: `%${searchTerm}%` },
        },
      });

      res.render('search', { books, searchTerm, sessionInformation: sessionInformation(req) });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
    }
  },

  deleteBook: async (req, res) => {
    //Implementar eliminar libro
    try {

      const bookToDelete = await db.Book.findByPk(req.params.id, {
          include: [{ model: db.Author, as: 'authors' }],
      });

      await bookToDelete.removeAuthors(bookToDelete.authors);

      await bookToDelete.destroy();

      res.render('home', { books, sessionInformation: sessionInfo });

  } catch (error) {
      console.log(error);
      throw {
          status: error.status || 500,
          message: error.message || 'Ups, hubo un error :('
      }
  }
   
  },
  authors: (req, res) => {
    db.Author.findAll()
      .then((authors) => {
        res.render('authors', { authors, sessionInformation: sessionInformation(req) });
      })
      .catch((error) => console.log(error));
  },
  authorBooks: async (req, res) => {
    // Implementar libros por autor
    try {
      const author = await db.Author.findByPk(req.params.id, {
        include: [{ model: db.Book, as: 'books' }],
      });

      if (!author) {
        return res.status(404).send('Autor no encontrado');
      }

      res.render('authorBooks', { author, sessionInformation: sessionInformation(req) });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
    }


  },
  register: (req, res) => {
    res.render('register', { errors: [], sessionInformation: sessionInformation(req) });
  },
  processRegister: async (req, res) => {
    try {
      // Extraer datos del formulario
      const { name, email, country, password, category } = req.body;

      // Validar que todos los campos obligatorios estén presentes
      if (!name || !email || !country || !password || !category) {
        return res.render('register', {
          errors: ['Todos los campos son obligatorios'],
          sessionInformation: sessionInformation(req)
        });
      }

      // Validar que el nombre tenga al menos dos letras
      if (name.length < 2) {
        return res.render('register', {
          errors: ['El nombre debe tener al menos dos letras'],
          sessionInformation: sessionInformation(req)
        });
      }

      // Validar que el correo electrónico no esté registrado en la base de datos
      const existingUser = await db.User.findOne({
        where: {
          Email: email
        }
      });

      if (existingUser) {
        return res.render('register', {
          errors: ['El correo electrónico ya está registrado'],
          sessionInformation: sessionInformation(req)
        });
      }


      // Hashear la contraseña
      const hashedPassword = bcryptjs.hashSync(password, 10);
      // Crear el nuevo usuario en la base de datos
      await db.User.create({
        Name: name,
        Email: email,
        Country: country,
        Pass: hashedPassword,
        CategoryId: category
      });

      // Redirigir a la página principal 
      res.render('login', { errors: [], sessionInformation: sessionInformation(req) });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
    }
  },
  login: (req, res) => {
    // Implementa login 
    res.render('login', { errors: [], sessionInformation: sessionInformation(req) });
  },
  processLogin: async (req, res) => {
    // Implement login process

    userEmail = req.body.email;
    passLogin = req.body.password;

    let userInDb = await db.User.findOne({
      where: {
        Email: userEmail
      }
    });

    if (userInDb) {
      let passMatch = bcryptjs.compareSync(passLogin, userInDb.Pass);

      if (passMatch) {
        delete userInDb.Pass;

        // dejo los datos en cookie
        res.cookie('userEmail', userEmail, { maxAge: (1000 * 60) * 60 });
        res.cookie('userName', userInDb.Name, { maxAge: (1000 * 60) * 60 });
        res.cookie('userIsAdmin', userInDb.CategoryId === 1, { maxAge: (1000 * 60) * 60 });

        return res.redirect('/');
      } else {

        res.render('login', {
          errors: ['Las credenciales son inválidas'],

          sessionInformation: sessionInformation(req)
        });
      }
    }

    try {
      const books = await db.Book.findAll({
        include: [{ association: 'authors' }]
      });

      res.render('home', { books, sessionInformation: sessionInformation(req) });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
    }


  },
  processLogout: (req, res) => {
    // Implementa logout process
    res.clearCookie('userEmail');
    res.clearCookie('userName');
    res.clearCookie('userIsAdmin');

    res.redirect('/');
  },
  edit: async (req, res) => {
    try {
      const book = await db.Book.findByPk(req.params.id, {
        include: [{ association: 'authors' }]
      });
      if (!book) {
        return res.status(404).send('Libro no encontrado');
      }
      res.render('editBook', { book, sessionInformation: sessionInformation(req) });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
    }
  },
  processEdit: async (req, res) => {
    try {

      const { title, cover, description } = req.body

      const book = await db.Book.findByPk(req.params.id, {
          include: ['authors']
          /* include: [{ association: 'authors' }] */
      })

      book.title = title || book.title;
      book.cover = cover || book.cover;
      book.description = description || book.description;

      await book.save()

      return res.redirect(`/books/detail/${req.params.id}`)

  } catch (error) {
      console.log(error);
      throw {
          status: error.status || 500,
          message: error.message || 'Ups, hubo un error :('
      }
  }


},
  /*   try {
      const bookId = req.params.id;

      // Obtén el libro con sus autores asociados
      const book = await db.Book.findByPk(bookId, {
        include: [{ association: 'authors' }]
      });

      if (!book) {
        return res.status(404).send('Libro no encontrado');
      }

      // Actualiza los campos del libro
      book.title = req.body.title;
      book.description = req.body.description;

      // Actualiza los autores del libro
      // Primero, quita todos los autores asociados
      await book.removeAuthors(book.authors);

      // Luego, agrega los nuevos autores seleccionados
      const selectedAuthors = req.body.authors;
      if (selectedAuthors && selectedAuthors.length > 0) {
        await book.addAuthors(selectedAuthors);
      }

      // Guarda los cambios en el libro
      await book.save();

      res.redirect('/', { sessionInformation: sessionInformation(req) }); // Redirige a la página principal o a donde sea necesario
    } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
    } */
  
};

module.exports = mainController;
