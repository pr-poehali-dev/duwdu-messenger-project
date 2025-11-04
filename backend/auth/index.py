'''
Business: User authentication - register, login with password, update profile
Args: event with httpMethod, body containing username, password, display_name, avatar_url
Returns: HTTP response with user data or error
'''

import json
import os
import psycopg2
import hashlib
from typing import Dict, Any

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action', 'login')
        username = body_data.get('username', '').strip()
        password = body_data.get('password', '').strip()
        
        if not username or not password:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Username and password required'})
            }
        
        if action == 'register':
            display_name = body_data.get('display_name', '').strip()
            if not display_name:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Display name required'})
                }
            
            cur.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cur.fetchone():
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username already exists'})
                }
            
            avatar_colors = ['#0088cc', '#8e44ad', '#e74c3c', '#27ae60', '#f39c12', '#16a085']
            import random
            color = random.choice(avatar_colors)
            password_hash = hash_password(password)
            
            cur.execute(
                "INSERT INTO users (username, display_name, avatar_color, password_hash, is_online) VALUES (%s, %s, %s, %s, true) RETURNING id, username, display_name, avatar_color, avatar_url, bio",
                (username, display_name, color, password_hash)
            )
            user = cur.fetchone()
            conn.commit()
            
            cur.execute("SELECT id FROM chats WHERE name = 'Общий чат'")
            general_chat = cur.fetchone()
            if general_chat:
                cur.execute(
                    "INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (general_chat[0], user[0])
                )
                conn.commit()
            
            result = {
                'id': user[0],
                'username': user[1],
                'display_name': user[2],
                'avatar_color': user[3],
                'avatar_url': user[4],
                'bio': user[5]
            }
        
        elif action == 'login':
            password_hash = hash_password(password)
            cur.execute(
                "SELECT id, username, display_name, avatar_color, avatar_url, bio, password_hash FROM users WHERE username = %s",
                (username,)
            )
            user = cur.fetchone()
            
            if not user or user[6] != password_hash:
                cur.close()
                conn.close()
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid username or password'})
                }
            
            cur.execute("UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = %s", (user[0],))
            conn.commit()
            
            result = {
                'id': user[0],
                'username': user[1],
                'display_name': user[2],
                'avatar_color': user[3],
                'avatar_url': user[4],
                'bio': user[5]
            }
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(result),
            'isBase64Encoded': False
        }
    
    if method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('user_id')
        avatar_url = body_data.get('avatar_url')
        display_name = body_data.get('display_name')
        bio = body_data.get('bio')
        
        if not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'user_id required'})
            }
        
        updates = []
        params = []
        
        if avatar_url is not None:
            updates.append("avatar_url = %s")
            params.append(avatar_url)
        
        if display_name:
            updates.append("display_name = %s")
            params.append(display_name)
        
        if bio is not None:
            updates.append("bio = %s")
            params.append(bio)
        
        if updates:
            params.append(user_id)
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s RETURNING id, username, display_name, avatar_color, avatar_url, bio"
            cur.execute(query, params)
            user = cur.fetchone()
            conn.commit()
            
            result = {
                'id': user[0],
                'username': user[1],
                'display_name': user[2],
                'avatar_color': user[3],
                'avatar_url': user[4],
                'bio': user[5]
            }
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(result),
                'isBase64Encoded': False
            }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
