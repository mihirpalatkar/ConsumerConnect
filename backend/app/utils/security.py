from werkzeug.security import generate_password_hash
from werkzeug.security import check_password_hash


def hash_password(password):
    """
    Convert a plain-text password into a secure hash.
    """

    return generate_password_hash(password)


def verify_password(password_hash, password):
    """
    Check whether the entered password matches the stored hash.
    """

    return check_password_hash(password_hash, password)
