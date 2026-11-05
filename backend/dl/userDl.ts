import { userDao } from "../dao/userDao";

export const userDl = {
  findByEmail: userDao.findByEmail,
  findById: userDao.findById,
  create: userDao.create,
  updateProfile: userDao.updateProfile,
  setPresence: userDao.setPresence,
};
