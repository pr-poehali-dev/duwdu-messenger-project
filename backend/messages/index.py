'''
Business: Send and retrieve messages in chats
Args: event with httpMethod, queryStringParameters with chat_id, body for sending messages
Returns: HTTP response with messages list or sent message data
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
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    if method == 'GET':
        params = event.get('queryStringParameters', {})
        chat_id = params.get('chat_id')
        
        if not chat_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'chat_id required'})
            }
        
        cur.execute("""
            SELECT m.id, m.content, m.message_type, m.created_at,
                   u.id as user_id, u.username, u.display_name, u.avatar_color
            FROM messages m
            INNER JOIN users u ON m.user_id = u.id
            WHERE m.chat_id = %s
            ORDER BY m.created_at ASC
        """, (chat_id,))
        
        messages = []
        for row in cur.fetchall():
            messages.append({
                'id': row[0],
                'content': row[1],
                'message_type': row[2],
                'created_at': row[3].isoformat(),
                'user': {
                    'id': row[4],
                    'username': row[5],
                    'display_name': row[6],
                    'avatar_color': row[7]
                }
            })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(messages),
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        chat_id = body_data.get('chat_id')
        user_id = body_data.get('user_id')
        content = body_data.get('content', '').strip()
        message_type = body_data.get('message_type', 'text')
        
        if not chat_id or not user_id or not content:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'chat_id, user_id and content required'})
            }
        
        cur.execute(
            "INSERT INTO messages (chat_id, user_id, content, message_type) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
            (chat_id, user_id, content, message_type)
        )
        message = cur.fetchone()
        
        cur.execute(
            "SELECT id, username, display_name, avatar_color FROM users WHERE id = %s",
            (user_id,)
        )
        user = cur.fetchone()
        
        conn.commit()
        cur.close()
        conn.close()
        
        result = {
            'id': message[0],
            'chat_id': chat_id,
            'content': content,
            'message_type': message_type,
            'created_at': message[1].isoformat(),
            'user': {
                'id': user[0],
                'username': user[1],
                'display_name': user[2],
                'avatar_color': user[3]
            }
        }
        
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
