#!/bin/bash
set -e

# =================================================
#     Automated user account setup for a demo
# =================================================

# Account settings
USERNAME="tay"
USERMAIL="tay@demo.com"
PASSWORD="Test123!"
DISPLAY_NAME="🦋"
BIO="dreamy r&b & pretty things 🦋"
COOKIE="cookies_${USERNAME}.txt"
BASE="https://localhost:8443/api"

#
ALBUM_1="ffab75ab-f1b4-4357-a687-88ea5093f66a" # Kali Uchis - Sincerely,
ALBUM_2="c0f2a0fe-5c87-4f81-a9fb-350507105735" # Leon Thomas - MUTT
ALBUM_3="c241c2b9-0b62-44c4-9d73-c2edb996b219" # Mariah the Scientist - To Be Eaten Alive
ALBUM_4="c9018967-1382-47e4-87ac-486a824cd81d" # RAYE - My 21st Century Blues

rm -f "$COOKIE"

printf "[+] Registering $USERNAME... \n"
REGISTER_BODY=$(jq -n --arg u "$USERNAME" --arg m "$USERMAIL" --arg p "$PASSWORD" \
	'{username: $u, userMail: $m, password: $p}')
curl -sk -s -c "$COOKIE" -X POST "$BASE/auth/register" \
	-H "Content-Type: application/json" -d "$REGISTER_BODY"

printf "[~] Logging in $USERNAME..."
LOGIN_BODY=$(jq -n --arg u "$USERNAME" --arg p "$PASSWORD" '{username: $u, password: $p}')
curl -sk -c "$COOKIE" -X POST "$BASE/auth/login" \
	-H "Content-Type: application/json" -d "$LOGIN_BODY"

printf "[~] Setting display name + bio... \n"
PROFILE_BODY=$(jq -n --arg d "$DISPLAY_NAME" --arg b "$BIO" '{displayName: $d, bio: $b}')
curl -sk -b "$COOKIE" -X PATCH "$BASE/users/me" \
	-H "Content-Type: application/json" -d "$PROFILE_BODY"

printf "[+] Rating albums... \n"
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_1/rating" \
	-H "Content-Type: application/json" \
	-d '{"score": 5, "review": "dreamy, soft and beautiful"}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_2/rating" \
	-H "Content-Type: application/json" \
	-d '{"score": 4.5, "review": "the vocals are actually insane"}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_3/rating" \
	-H "Content-Type: application/json" \
	-d '{"score": 4.5, "review": "such a fun album, immaculate vibes"}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_4/rating" \
	-H "Content-Type: application/json" \
	-d '{"score": 5, "review": "RAYE is genuinely on another level"}'

# INFO DEV / un album doit etre en collection pour etre favori, apres faites comme vous voulez
printf "[+] Adding album to collection/favourite... \n"
curl -sk -b "$COOKIE" -X POST "$BASE/albums/$ALBUM_2/collection"
curl -sk -b "$COOKIE" -X PATCH "$BASE/albums/$ALBUM_2/collection/favorite"
curl -sk -b "$COOKIE" -X POST "$BASE/albums/$ALBUM_1/collection"
curl -sk -b "$COOKIE" -X POST "$BASE/albums/$ALBUM_3/collection"

printf "[+] Creating playlist(s)... \n"
PLAYLIST_RESPONSE=$(curl -sk -b "$COOKIE" -X POST "$BASE/playlists" \
	-H "Content-Type: application/json" \
	-d "$(jq -n '{title: "fav"}')")
MY_PLAYLIST=$(printf "$PLAYLIST_RESPONSE" | jq -r '.id')

if [ "$MY_PLAYLIST" = "null" ] || [ -z "$MY_PLAYLIST" ]; then
	printf "[x] Playlist creation failed: $PLAYLIST_RESPONSE"
	exit 1
fi

printf "Adding albums to playlist $MY_PLAYLIST..."
curl -sk -b "$COOKIE" -X POST "$BASE/playlists/$MY_PLAYLIST/albums/$ALBUM_3"

printf "[ok] $USERNAME demo account all set!"