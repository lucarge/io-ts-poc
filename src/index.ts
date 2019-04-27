import 'isomorphic-fetch'
import * as io from 'io-ts'

// CODECS
const ApiUser = io.type({
  id: io.number,
  name: io.union([io.null, io.string]),
})

const ApiUsers = io.array(ApiUser)

type TApiUser = io.TypeOf<typeof ApiUser>
type TApiUsers = io.TypeOf<typeof ApiUsers>

type TSerializedUser = TApiUser & { iAmAnImmutableMap: boolean } // FIXME: use immutable instead
type TSerializedUsers = TSerializedUser[]

type TUser = {
  iAmAnImmutableMap: boolean
  id: string
  name: string | null
}
type TUsers = TUser[]

// DESERIALIZERS
const deserialiseUserForApi = ({ iAmAnImmutableMap, ...user }: TSerializedUser) => user
const deserialiseUsersForApi = (users: TSerializedUsers) => users.map(deserialiseUserForApi)

// SERIALISER
const serializeApiUser = (user: TApiUser) => ({
  ...user,
  iAmAnImmutableMap: true, // FIXME: use immutable instead
})
const serializeApiUsers = (users: TApiUsers) => users.map(serializeApiUser)

// MAPPERS
const mapApiUser = (user: TSerializedUser) => ({
  ...user,
  id: user.id.toString(),
})
const mapApiUsers = (users: TSerializedUsers) => users.map(mapApiUser)

// REPORTERS
const consoleReporter = (errors: io.Errors) => {
  console.error('Data violation!', errors.map(error => error.context.map(ctx => ctx)))
}


const main = async () => {
  const response = await fetch('http://localhost:3000/users')
  const apiUsers = await response.json()

  const validation = ApiUsers.decode(apiUsers)

  const users = validation.fold<void | TUsers>(
    consoleReporter,
    (users) => {
      const serializedUsers = serializeApiUsers(users)
      
      return mapApiUsers(serializedUsers)
    }
  )

  if (users) {
    // NOTE: they can be safely put in the store here
    console.log('Putting users in the store', users)

    return {
      ...response,
      payload: users,
    }
  }

  return { ok: false }
}

main()
