'''
Business: Get user chats and create new chats/channels
Args: event with httpMethod, queryStringParameters with user_id, body for creating chats
Returns: HTTP response with chats list or created chat data
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
        user_id = params.get('user_id')
        
        if not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'user_id required'})
            }
        
        cur.execute("""
            SELECT c.id, c.name, c.type, c.created_at,
                   (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                   (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
            FROM chats c
            INNER JOIN chat_members cm ON c.id = cm.chat_id
            WHERE cm.user_id = %s
            ORDER BY last_message_time DESC NULLS LAST, c.created_at DESC
        """, (user_id,))
        
        chats = []
        for row in cur.fetchall():
            chats.append({
                'id': row[0],
                'name': row[1],
                'type': row[2],
                'created_at': row[3].isoformat() if row[3] else None,
                'last_message': row[4],
                'last_message_time': row[5].isoformat() if row[5] else None
            })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(chats),
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        name = body_data.get('name', '').strip()
        chat_type = body_data.get('type', 'channel')
        user_id = body_data.get('user_id')
        
        if not name or not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'name and user_id required'})
            }
        
        cur.execute(
            "INSERT INTO chats (name, type, created_by) VALUES (%s, %s, %s) RETURNING id, name, type, created_at",
            (name, chat_type, user_id)
        )
        chat = cur.fetchone()
        
        cur.execute(
            "INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)",
            (chat[0], user_id)
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        result = {
            'id': chat[0],
            'name': chat[1],
            'type': chat[2],
            'created_at': chat[3].isoformat()
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
