import UserModel from "./models/user-model.js";

// Comparación de emails sin distinguir mayúsculas (los usuarios existentes pueden tener mayúsculas guardadas).
const EMAIL_COLLATION = { locale: "es", strength: 2 };

class UserDAO {
    async createUser(user) {
        try {
            const newUser = await UserModel.create(user);
            return newUser;
        } catch (error) {
            throw error;
        }
    }

    async getUserById(id) {
        try {
            return await UserModel.findById(id);
        } catch (error) {
            throw error;
        }
    }

    async updateUser(id, user) {
        try {
            const updatedUser = await UserModel.findByIdAndUpdate(id, user, { new: true });
            return updatedUser;
        } catch (error) {
            throw error;
        }
    }
    async deleteUser(id) {
        try {
            const deletedUser = await UserModel.findByIdAndDelete(id);
            return deletedUser;
        } catch (error) {
            throw error;
        }
    }

    async getUsers() {
        try {
            const users = await UserModel.find();
            return users;
        } catch (error) {
            throw error;
        }
    }
    // Incluye el hash de la contraseña: lo necesita el login. No devolver este resultado al cliente.
    async getUserByEmail(email) {
        try {
            const user = await UserModel.findOne({ email })
                .collation(EMAIL_COLLATION)
                .select("+password");
            return user;
        } catch (error) {
            throw error;
        }
    }
}
export default new UserDAO();
