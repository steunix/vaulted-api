# Forewords

This project is still a work in progress, bolts need to be tightened...

# Vaulted

Vaulted is a collaborative secrets manager API. It allows to safely store and retreive sensitive data, such as sites passwords, API credentials, network passwords... in other words any information that needs to be encrypted, protected, monitored, shared.

It's **collaborative**, meaning that users are organized in groups and protected items are organized in folders: different permissions can be defined for each folder for each user group.

## What is it

Vaulted is "only" a full API, there is no GUI or CLI: you can easily integrate it with your systems and let it act as a Password Centralized Vault. If you want a GUI... it will be available soon.

Vaulted is a NodeJS application, released under MIT license, and it uses these (great) opensource libraries, among several others:
- Express, to manage HTTPS connections
- Prisma, for ORM and DB access

## How it works

### Items
An 'item' is an entity with some encrypted data. Vaulted just encrypt "strings", so your data can be anything that can be converted into a string: there is not built-in logic on the content.

For example, in one item you may store a JSON object that identifies a login:
{
  url: "abc",
  user: "aaa",
  password: ""
}

and in another item you may have something that represents an API credentials set:
{
  clientid: "",
  clientsecret: "",
  url: "",
  scope: ""
}

It's up to the consumer to decode and handle the data.

An item has always a "title" field, that can be searched for and is NOT encrypted: do not use it for storing sensitive information.

### Folders

Folders, just like in a file system, holds a collection of items and/or subfolders. Each folder may hold specific persmissions for a given group, but will inherit parent's credentials (see 'Permissions' below).

Each user has a 'personal' folder for storing private, not-shared-with-anyone, items. Not even 'admin' user can read these items because they are encrypted with a different key.

Vaulted has 2 predefined folders that cannot be modified:
- Root folder
- Personal folders root

### Users and groups

Users are assigned to groups, and groups have read/write permissions for a given folder.

There is only one built-in 'superuser', namely **admin**, who can create other users and user groups. And **admin** is part of **Admins** built-in group: admin cannot be removed from Admins, but other users can join it.

Finally, users can join several groups simultaneously.

### Permissions

A folder has 2 permissions:
- read: permission to list and read items
- write: permission to create/modify items or subfolders. It implies read permission.

Permissions are on **folders**, and not on single items, and are granted **to groups** of users, and not to single users: this is intentional, following the KISS philosophy; in complex environments, permissions for a single user or single item are difficult to maintain and very easy to forget, while group permissions let you have a cleaner and more maintainable configuration.

Following same KISS paradigm, permissions are **always** inherited. For example, in a company setup you may have these folders:

- Root
  - Datacenters
    - Azure
    - AWS
    - GCP
  - Headquarter
    - VPNs
    - NAS systems

Suppose that datacenters are managed by different groups of people: you would have a "AzureAdmins" group, along with "AWSAdmins" and "GCPAdmins", and you would give read+write permissions to each group on its own folder.

You may have a user managing both GPC and AWS, so you would just have to add the user to both "AWSAdmins" and "GCPAdmins".

But, remember, **permissions are always inherited**. What does this mean?

If an "AdminGCP" user creates a new folder in "GCP", let's suppose "VPNs", what happens? This folder would inherit the "GCP" permissions, thus, in our example, read+write for "GCPAdmins". Even if this new "VPNs" folder is given read+write permissions on a completely different group, and not "AdminGCP" explicitly, "AdminGCP" will always have read+write permissions.

In other words, a permission on a folder is granted **for itself and all its children folders**, with no exception.

Think of it as a regular hard disk folder: 'root' user has access to all directories, and while user 'dummy' may create subdirectory, root will always be able to access them even if they have '700' permissions.

While this may sound as a limitation, in the long run it allows to avoid wild permissions forests, such as "hidden" folders available only to a restricted number of people, in a point of the tree
where you would not expect. "Branch" admins are "responsible" for everything is happening in "their" tree.

That is indeed **exactly** how user 'Admin' in Vaulted works: it's part of the builtin "Admins" group and "Admins" have read+write access to 'Root' folder, thus to every folder due to inheritance.

## Encryption

Items are encrypted and stored in the database using a master key that is read **from the environment variable VAULTED_MASTER_KEY**: there is no other way to get the master key and this is fully intentional, in order to leave the responsability of safely keeping your master key secret completely **up to you**.

Items are encrypted with AES-GCM algorithm, along with IV and secure token, using the master key.

**WARNING**: as with any other software using asymmetric encryption, if you loose your master key you're **completely screwed** and there is no way to recover encrypted data. So be sure you keep your master key safe and *properly backed up*.

## Access logging

Every operation is logged into the database., from logins to CRUD operations to items access.

## The API

### Authorization

Vaulted uses JWTs for authorization with a SHA-512 has algorythm. No sensitive data is stored within the token, just the user id.

A JWT is returned on successful login, and it must be provided in all subsequent calls - until it expires - in requests header as an "Authorization bearer".

### Responses

Vaulted endpoints respond with standard HTTP response codes, so be sure to handle them correctly:

- 400: Bad request: your payload is not valid, malformed, or missing some field
- 401: Unauthorized: you haven't logged in yet, or your JWT is not valid/expired
- 403: Forbidden: you do not have permissions to do what you're asking for
- 404: Not found: what you are looking for does not exist
- 422: Unprocessable entity: the entity you are accessing exists, but the data you provided is not acceptable

Along with HTTP response code, you'll always get this minimum payload:
```
{
  status: success/failed,
  message: text
}
```

In case of errors (success=false), you can find the explanation in the "message" field.

If any data is returned by the endpoint, it will be always encapsulated in a "data" field:
```
{
  status: success/failed,
  message: text,
  data: { whatever }
}
```

# Install and run

## Install

Download the source, and install all dependencies with npm:

npm install

## Configure

Edit config.json

## Environment

Your environment must contain these 2 variables (these are the default names, they can be changed in config.json):

- VAULTED_MASTER_KEY: the AES-256-GCM key used for encryption
- VAULTED_JWT_KEY: the key used to sign JWT tokens for API authorization

## Database

Vaulted uses Prisma to access the database. As the time of writing, the database is a SQLite db (vaulted.db), and it's located in prisma/ subfolder: I will
soon add proper configuration in config.js, allowing also for other RDBMS.

LIMITATION: ATM Prisma does not allow to specify a column length for text columns, so they are all created with the maximum width allowed by the single
backend; this is of course sub-optimal and will be addressed in Vaulted in a later time.

To initialize the db:

- npx prisma db push

To feed initial data (built-it data):

- npx prisma db feed

## Run

npm vaulted.mjs
