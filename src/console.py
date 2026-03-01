#!/usr/bin/python3
"""
Console
"""

import cmd


class NucCommand(cmd.Cmd):
    """CS Lib Nuc Console"""""
    prompt = '(cs-lib-nuc) '

    def do_EOF(self, arg):
        """Exits console"""
        return True

    def emptyline(self):
        """ overwriting the emptyline method """
        return False

    def do_quit(self, arg):
        """Quit command to exit the program"""
        return True

if __name__ == '__main__':
    NucCommand().cmdloop()

