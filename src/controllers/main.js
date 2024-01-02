const bcryptjs = require('bcryptjs');
const db = require('../database/models');
const {Op} = require('sequelize');

const mainController = {
  home: (req, res) => {
    db.Book.findAll({
      include: [{ association: 'authors' }]
    })
      .then((books) => {
        res.render('home', { books });
      })
      .catch((error) => console.log(error));
  },
  bookDetail: async (req, res) => {
    // Implement look for details in the database

    try {
      const book = await db.Book.findByPk(req.params.id, {
        include: [{ association: 'authors' }]
      })

      if (!book) {
        return res.status(404).send('Libro no encontrado');
      }

      return res.render('bookDetail', {
        book
      })

    } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
    }
  },

  bookSearch: (req, res) => {
    res.render('search', { books: [] });
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

      res.render('search', { books, searchTerm });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
    }
  },

  deleteBook: (req, res) => {
    // Implement delete book
    res.render('home');
  },
  authors: (req, res) => {
    db.Author.findAll()
      .then((authors) => {
        res.render('authors', { authors });
      })
      .catch((error) => console.log(error));
  },
  authorBooks: async(req, res) => {
    // Implement books by author
    try {
      const author = await db.Author.findByPk(req.params.id, {
        include: [{ model: db.Book, as: 'books' }],
      });

      if (!author) {
        return res.status(404).send('Autor no encontrado');
      }

      res.render('authorBooks', { author });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
    }

   
  },
  register: (req, res) => {
    res.render('register');
  },
  processRegister: async (req, res) => {
    try {
        // Extraer datos del formulario
        const { name, email, country, password, category } = req.body;

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

        // Redirigir a la página principal o a donde sea necesario después del registro
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error interno del servidor');
    }
},
  login: (req, res) => {
    // Implement login process
    res.render('login');
  },
  processLogin: (req, res) => {
    // Implement login process
    res.render('home');
  },
  edit: async (req, res) => {
    try {
        const book = await db.Book.findByPk(req.params.id);
        if (!book) {
            return res.status(404).send('Libro no encontrado');
        }
        res.render('editBook', { book });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error interno del servidor');
    }
},
processEdit: async (req, res) => {
  try {
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

      res.redirect('/'); // Redirige a la página principal o a donde sea necesario
  } catch (error) {
      console.error(error);
      res.status(500).send('Error interno del servidor');
  }
},
};

module.exports = mainController;
