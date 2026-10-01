-- El check-in es un solo listado con todos: ya no hay horario por punto de partida.
ALTER TABLE "Puesto" DROP COLUMN "horaCheckin";
