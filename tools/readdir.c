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
#include <dirent.h>

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

    return (*p0 > *p1) - (*p1 > *p0);
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

    while ((dirent = readdir(dir)))
        if (dirent->d_type == DT_REG &&
            *(dirent->d_name) != '.' &&
            StrCmp(dirent->d_name, ".") &&
            StrCmp(dirent->d_name, ".."))
            fprintf(stdout, "%s\n", dirent->d_name);

    closedir(dir);

    return 0;
}

int main (int argc, char** argv)
{
    int res = ReadDir(*(argv + 1));

    return res;
}
