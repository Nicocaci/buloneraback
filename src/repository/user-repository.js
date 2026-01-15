import UserDAO from "../dao/user-dao.js";

class UserRepository {
    async createUser(user) {
        return await UserDAO.createUser(user);
    }
    async getUserById(id) {
        return await UserDAO.getUserById(id);
    }
    async updateUser(id, user) {
        return await UserDAO.updateUser(id, user);
    }
    async deleteUser(id) {
        return await UserDAO.deleteUser(id);
    }
    async getUsers() {
        return await UserDAO.getUsers();
    }
    async getUserByEmail(email) {
        return await UserDAO.getUserByEmail(email);
    }
}
export default new UserRepository();