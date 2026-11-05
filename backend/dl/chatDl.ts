import { chatDao } from "../dao/chatDao";

export const chatDl = {
  isMember: chatDao.isMember,
  createIndividual: chatDao.createIndividual,
  participants: chatDao.participants,
  listForUser: chatDao.listForUser,
  touch: chatDao.touch,
  setPresence: chatDao.setPresence,
};
