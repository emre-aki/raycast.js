/*
 *  readdir.c
 *  raycast.js
 *
 *  Created by Emre Akı on 2025-05-17.
 *
 *  SYNOPSIS:
 *      ::TODO::
 */

#include <stdio.h>
#include <stdlib.h>
#include <dirent.h>

#define MAX_DIRENTS 128

typedef unsigned char byte;

typedef struct dirent dirent_t;

int StrCmp (const char* str0, const char* str1)
{
    byte* p0 = (byte*) str0, *p1 = (byte*) str1;

    while (*p0 == *p1 && *p0)
    {
        ++p0;
        ++p1;
    }

    return (*p1 < *p0) - (*p0 < *p1);
}

int StrCmpSort (const void* s0, const void* s1)
{
    return StrCmp(*((const char**) s0), *((const char**) s1));
}

int ReadDir (const char* path)
{
    DIR* dir = opendir(path);
    if (!dir)
    {
        fprintf(stderr,
                "[ReadDir] Error while opening directory: %s.\n",
                path);

        return 1;
    }

    dirent_t* dirent;
    size_t count = 0;
    const char* dirent_names[MAX_DIRENTS];

    while ((dirent = readdir(dir)))
        if (dirent->d_type == DT_REG &&
            *(dirent->d_name) != '.' &&
            StrCmp(dirent->d_name, ".") &&
            StrCmp(dirent->d_name, ".."))
            *(dirent_names + count++) = dirent->d_name;

    qsort(dirent_names, count, sizeof(char*), StrCmpSort);

    for (size_t i = 0; i < count; ++i)
        fprintf(stdout, "%s\n", *(dirent_names + i));

    closedir(dir);

    return 0;
}

int main (int argc, char** argv)
{
    int res = ReadDir(*(argv + 1));

    return res;
}
