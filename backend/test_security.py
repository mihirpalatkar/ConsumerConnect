from app.utils.security import hash_password
from app.utils.security import verify_password

password = "test123"

hashed_password = hash_password(password)

print("Original Password :", password)
print("Hashed Password   :", hashed_password)

print()

print("Correct Password :", verify_password(hashed_password, "test123"))
print("Wrong Password   :", verify_password(hashed_password, "abcd123"))
