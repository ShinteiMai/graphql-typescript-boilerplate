import * as bcrypt from "bcryptjs";
import * as yup from "yup";

import { ResolverMap } from "../../types/graphql-utils";
import { User } from "../../entity/User";
import { formattedError } from "../../utils/formattedError";
import { createConfirmationLink } from "../../utils/createConfirmationLink";

const schema = yup.object().shape({
  email: yup.string().min(3).max(255).email(),
  password: yup.string().min(3).max(255),
});

export const resolvers: ResolverMap = {
  Query: {
    default: () => "Default query for GraphQL",
  },
  Mutation: {
    register: async (_, args, { redis, url }) => {
      try {
        await schema.validate(args, { abortEarly: false });
      } catch (err) {
        return formattedError(err);
      }

      const { email, password } = args;

      const existingUser = await User.findOne({
        where: { email },
        select: ["id"],
      });
      if (existingUser) {
        return [
          {
            path: "email",
            message: "email already taken",
          },
        ];
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({
        email,
        password: hashedPassword,
      });
      await user.save();

      const link = await createConfirmationLink(url, user.id, redis);
      console.log(link);

      return null;
    },
  },
};
