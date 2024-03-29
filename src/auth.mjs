/**
 * Authorization module
 * @module src/auth
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'

import * as R from '../src/response.mjs'
import jsonwebtoken from 'jsonwebtoken'
import * as Config from '../src/config.mjs'

const prisma = new PrismaClient(Config.get().prisma_options)

/**
 * Creates a JWT token
 * @param {string} user User ID
 * @param {boolean} personalfolder Grant access to personal folder
 * @returns {string} A JWT
 */
export async function createToken(user, personalfolder) {
  const isadmin = await isAdmin(user)

  return jsonwebtoken.sign(
    { user: user, admin: isadmin, personalfolder: personalfolder },
    Config.get().jwt_key, {
      algorithm: "HS512",
      expiresIn: Config.get().jwt_duration
    }
  )
}

/**
 * JWT validation middleware
 * @param {Object} req Request
 * @param {Object} res Response
 * @param {Function} next Next action
 * @returns {boolean} True if JWT is valid
 */
export function validateJWT(req, res, next) {
  let token
  try {
    token = req.headers["authorization"].split(" ")[1]
  } catch ( exc ) {
    return res.status(401).send(R.ko("A token is required for authentication"))
  }
  try {
    const decoded = jsonwebtoken.verify(token, Config.get().jwt_key)
    req.jwt = decoded
    req.user = decoded.user
    req.personalfolder = decoded.personalfolder
  } catch (err) {
    var msg = "Invalid token"
    if ( err.name=='TokenExpiredError' ) {
      msg = "Token expired"
    }
    return res.status(401).send(R.ko(msg))
  }
  return next()
}

/**
 * Check if current user is an admin
 * @param {any} entity User (string) or request (object)
 * @returns {boolean} Whether current request user has admin privileges or not
 */
export async function isAdmin(entity) {
  if ( typeof(entity)==="string" ) {
    const perm = await prisma.usersGroups.findMany({
      where: {
        group: "A",
        user: entity
      }
    })
    return perm.length>0
  } else {
    return entity.jwt.admin
  }
}