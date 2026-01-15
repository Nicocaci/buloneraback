import UserRepository from "../repository/user-repository.js";

class UserService {
    async createUser(user) {
        return await UserRepository.createUser(user);
    }
    async getUserById(id) {
        return await UserRepository.getUserById(id);
    }
    async updateUser(id, user) {
        return await UserRepository.updateUser(id, user);
    }
    
    async deleteUser(id) {
        return await UserRepository.deleteUser(id);
    }
    async getUsers() {
        return await UserRepository.getUsers();
    }
    async getUserByEmail(email) {
        return await UserRepository.getUserByEmail(email);
    }
}
export default new UserService();