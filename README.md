[![progress-banner](https://backend.codecrafters.io/progress/git/63fd1b62-cb46-4088-9050-e197afa2a069)](https://app.codecrafters.io/users/codecrafters-bot?r=2qF)

This repository is my TypeScript solution-in-progress for the
["Build Your Own Git" Challenge](https://codecrafters.io/challenges/git).

Current implementation supports:

* Initialize a repository (`init`)
* Read a blob object (`cat-file -p <blob_sha>`)
* Create (hash & store) a blob object (`hash-object -w <file>`)
* Read (list) a tree object (`ls-tree <tree_sha>` / `--name-only`)
* Write a tree object representing the working directory (`write-tree`)
* Create a commit object (`commit-tree <tree_sha> -m <message>` with optional `-p <parent_sha>`)

Not yet implemented:

* Clone (Smart HTTP) – planned next.

This is being built incrementally; each command writes/reads actual Git object
files under `.git/objects` using proper headers + zlib compression.

**Note**: If you're viewing this repo on GitHub, head over to
[codecrafters.io](https://codecrafters.io) to try the challenge.

# Usage examples

Initialize:

```sh
./your_program.sh init
```

Create & store a blob (prints SHA):

```sh
echo "hello" > hello.txt
./your_program.sh hash-object -w hello.txt
```

Show blob contents:

```sh
./your_program.sh cat-file -p <blob_sha>
```

Write working directory tree (prints tree SHA):

```sh
./your_program.sh write-tree
```

List a tree:

```sh
./your_program.sh ls-tree <tree_sha>
./your_program.sh ls-tree --name-only <tree_sha>
```

Create a commit:

```sh
TREE=$(./your_program.sh write-tree)
./your_program.sh commit-tree $TREE -m "Initial commit"
```

Create a commit with a parent:

```sh
NEW_TREE=$(./your_program.sh write-tree)
./your_program.sh commit-tree $NEW_TREE -p <parent_commit_sha> -m "Second commit"
```

Inspect commit with real git (for comparison):

```sh
git cat-file -p <commit_sha>
```

# Testing locally

The `your_program.sh` script is expected to operate on the `.git` folder inside
the current working directory. If you're running this inside the root of this
repository, you might end up accidentally damaging your repository's `.git`
folder.

We suggest executing `your_program.sh` in a different folder when testing
locally. For example:

```sh
mkdir -p /tmp/testing && cd /tmp/testing
/path/to/your/repo/your_program.sh init
```

To make this easier to type out, you could add a
[shell alias](https://shapeshed.com/unix-alias/):

```sh
alias mygit=/path/to/your/repo/your_program.sh

mkdir -p /tmp/testing && cd /tmp/testing
mygit init
```
