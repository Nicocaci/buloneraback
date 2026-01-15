import UserModel from "./models/user-model.js";

class UserDAO {
    async createUser(user) {
        try {
            const newUser = await UserModel.create(user);
            return newUser;
        } catch (error) {
            throw new Error(error);
        }
    }

    async getUserById(id) {
        try {
            const user = await UserModel.findById(id);
            return user;
        } catch (error) {
            throw new Error(error);
        }
    }
    
    async updateUser(id, user) {
        try {
            const updatedUser = await UserModel.findByIdAndUpdate(id, user, { new: true });
            return updatedUser;
        } catch (error) {
            throw new Error(error);
        }
    }
    async deleteUser(id) {
        try {
            const deletedUser = await UserModel.findByIdAndDelete(id);
            return deletedUser;
        } catch (error) {
            throw new Error(error);
        }
    }
    
    async getUsers() {
        try {
            const users = await UserModel.find();
            return users;
        } catch (error) {
            throw new Error(error);
        }
    }
    async getUserByEmail(email) {
        try {
            const user = await UserModel.findOne({ email });
            return user;
        } catch (error) {
            throw new Error(error);
        }
    }
}
export default new UserDAO();