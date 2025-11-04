'''
Business: User authentication - register and login users
Args: event with httpMethod, body containing username and display_name
Returns: HTTP response with user data or error
'''

import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        username = body_data.get('username', '').strip()
        display_name = body_data.get('display_name', '').strip()
        
        if not username or not display_name:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Username and display name required'})
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        cur.execute(
            "SELECT id, username, display_name, avatar_color FROM users WHERE username = %s",
            (username,)
        )
        user = cur.fetchone()
        
        if user:
            result = {
                'id': user[0],
                'username': user[1],
                'display_name': user[2],
                'avatar_color': user[3]
            }
        else:
            avatar_colors = ['#0088cc', '#8e44ad', '#e74c3c', '#27ae60', '#f39c12', '#16a085']
            import random
            color = random.choice(avatar_colors)
            
            cur.execute(
                "INSERT INTO users (username, display_name, avatar_color) VALUES (%s, %s, %s) RETURNING id, username, display_name, avatar_color",
                (username, display_name, color)
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
                'avatar_color': user[3]
            }
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(result),
            'isBase64Encoded': False
        }
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
