// src/controllers/ticketController.js
const Ticket = require('../models/Ticket');
const { getIO } = require('../helpers/socket');
const User = require('../models/User');

exports.createTicket = async (req, res) => {
  const { chasis, cod_pos, cant, comentario, cliente, rubro } = req.body;

  if (!req.user || req.user.role !== 'vendedor') {
    return res.status(403).json({ error: 'Solo un vendedor puede crear tickets' });
  }

  try {
    // Buscamos un usuario que tenga 'rubro' dentro de su array de rubros
    // role: 'compras' y rubros: { $in: [rubro] }
    const comprador = await User.findOne({
      role: 'compras',
      rubros: { $in: [rubro] } 
    });

    if (!comprador) {
      return res.status(400).json({ error: 'No hay un usuario de compras que maneje este rubro.' });
    }

    const ticket = new Ticket({
      chasis,
      cod_pos,
      cant,
      comentario,
      cliente,
      rubro,                         // guardamos el rubro
      compradorAsignado: comprador._id, // asignamos el usuario de compras
      usuario: req.user.id
    });

    await ticket.save();

    const io = getIO();
    io.emit('nuevoTicket', ticket);

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).json({ error: 'Error al crear el ticket' });
  }
};


exports.getMyTickets = async (req, res) => {
  if (req.user.role !== 'vendedor') {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  try {
    // Ordenar por fecha descendente (la fecha más reciente primero)
    const tickets = await Ticket.find({ usuario: req.user.id })
      .sort({ fecha: -1 });

    res.json(tickets);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
};


exports.getAllTickets = async (req, res) => {
  if (!['compras', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  try {
    let filter = {};
    // Si es 'compras', solo los que están asignados a él
    if (req.user.role === 'compras') {
      filter = { compradorAsignado: req.user.id };
    }

    // Si es 'admin', puede ver todos
    const tickets = await Ticket.find(filter)
      .sort({ fecha: -1 })
      .populate('usuario', 'username')
      .populate('compradorAsignado', 'username');

    res.json(tickets);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
};


exports.resolveTicket = async (req, res) => {
  console.log('resolveTicket -> Datos recibidos:', req.body);
  console.log('resolveTicket -> ID del ticket:', req.params.id);
  console.log('resolveTicket -> Rol del usuario:', req.user.role);

  if (!['compras', 'vendedor'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  const { id } = req.params;
  const { resolucion, codigo, cantidad_resuelta, proveedor, ingreso, comentario_resolucion, avisado, pago, estado } = req.body;

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      console.log('resolveTicket -> Ticket no encontrado');
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Actualizaciones según el rol
    if (req.user.role === 'vendedor') {
      if (avisado !== undefined) ticket.avisado = avisado;
      if (pago !== undefined) ticket.pago = pago;
    }

    if (req.user.role === 'compras') {
      if (resolucion !== undefined) ticket.resolucion = resolucion;
      if (codigo !== undefined) ticket.codigo = codigo;
      if (cantidad_resuelta !== undefined) ticket.cantidad_resuelta = cantidad_resuelta;
      if (proveedor !== undefined) ticket.proveedor = proveedor;
      if (ingreso !== undefined) ticket.ingreso = ingreso;
      if (comentario_resolucion !== undefined) ticket.comentario_resolucion = comentario_resolucion;
      if (estado && ['pendiente', 'resuelto', 'negativo'].includes(estado)) {
        ticket.estado = estado;
      }
    }

    await ticket.save();

    // Obtén la instancia de io:
    const io = getIO();
    io.emit('ticketActualizado', ticket);

    console.log('resolveTicket -> Ticket actualizado:', ticket);
    res.json(ticket);
  } catch (error) {
    console.error('resolveTicket -> Error al actualizar el ticket:', error.message);
    res.status(500).json({ error: 'Error al actualizar el ticket' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ message: 'El texto del comentario es requerido' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    const nuevoComentario = {
      texto,
      fecha: new Date(),
      usuario: req.user.id,
    };

    ticket.comentarios.push(nuevoComentario);

    // Marcar nuevos comentarios para la otra parte
    if (req.user.role === 'vendedor') {
      ticket.nuevosComentarios.compras = true;
    } else if (req.user.role === 'compras') {
      ticket.nuevosComentarios.vendedor = true;
    }

    await ticket.save();

    const comentarioCompleto = await Ticket.findById(ticket._id)
    .select('comentarios')
    .populate('comentarios.usuario', 'username');
  
  const comentarioAgregado = comentarioCompleto.comentarios.slice(-1)[0];
  
  // Emitir solo el comentario agregado
  const io = getIO();
  io.emit('nuevoComentario', {
    ticketId: ticket._id, // Asociar explícitamente al ID del ticket
    comentario: comentarioAgregado, // Emitir solo el comentario recién agregado
  });
  
  res.status(201).json(comentarioAgregado); // Devolver solo el nuevo comentario
  
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;

    // Encuentra el ticket y popula los usuarios en los comentarios
    const ticket = await Ticket.findById(id).populate('comentarios.usuario', 'username');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json(ticket.comentarios); // Devuelve los comentarios con información del usuario
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
};


exports.markCommentsAsRead = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (req.user.role === 'vendedor') {
      ticket.nuevosComentarios.vendedor = false;
    } else if (req.user.role === 'compras') {
      ticket.nuevosComentarios.compras = false;
    }

    await ticket.save();
    console.log('Ticket actualizado:', ticket);

    // Emitimos un evento "comentariosLeidos"
    const io = getIO();
    io.emit('comentariosLeidos', {
      ticketId: ticket._id,
      role: req.user.role
    });

    res.status(200).json({ message: 'Comentarios marcados como leídos' });
  } catch (error) {
    console.error('Error al marcar comentarios como leídos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Ticket.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json({ message: 'Ticket eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    res.status(500).json({ error: 'Error al eliminar ticket' });
  }
};
