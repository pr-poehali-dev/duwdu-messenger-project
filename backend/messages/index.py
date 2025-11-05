'''
Business: Send, retrieve, and delete messages in chats
Args: event with httpMethod, queryStringParameters with chat_id/message_id, body for sending messages
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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
            SELECT m.id, m.content, m.message_type, m.created_at, m.media_url,
                   u.id as user_id, u.username, u.display_name, u.avatar_color, u.avatar_url
            FROM messages m
            INNER JOIN users u ON m.user_id = u.id
            WHERE m.chat_id = %s AND m.removed_at IS NULL
            ORDER BY m.created_at ASC
        """, (chat_id,))
        
        messages = []
        for row in cur.fetchall():
            messages.append({
                'id': row[0],
                'content': row[1],
                'message_type': row[2],
                'created_at': row[3].isoformat(),
                'media_url': row[4],
                'user': {
                    'id': row[5],
                    'username': row[6],
                    'display_name': row[7],
                    'avatar_color': row[8],
                    'avatar_url': row[9]
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
    
    if method == 'DELETE':
        params = event.get('queryStringParameters', {}) if event.get('queryStringParameters') else {}
        body_data = json.loads(event.get('body', '{}')) if event.get('body') else {}
        message_id = params.get('message_id') or body_data.get('message_id')
        user_id = params.get('user_id') or body_data.get('user_id')
        
        if not message_id or not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'message_id and user_id required'})
            }
        
        cur.execute(
            "UPDATE messages SET removed_at = CURRENT_TIMESTAMP WHERE id = %s AND user_id = %s RETURNING id",
            (message_id, user_id)
        )
        deleted = cur.fetchone()
        
        if not deleted:
            cur.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Message not found or you are not the owner'})
            }
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'message_id': message_id}),
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        chat_id = body_data.get('chat_id')
        user_id = body_data.get('user_id')
        content = body_data.get('content', '').strip()
        message_type = body_data.get('message_type', 'text')
        media_url = body_data.get('media_url')
        
        if not chat_id or not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'chat_id and user_id required'})
            }
        
        if not content and not media_url:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'content or media_url required'})
            }
        
        cur.execute(
            "INSERT INTO messages (chat_id, user_id, content, message_type, media_url) VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at",
            (chat_id, user_id, content or '', message_type, media_url)
        )
        message = cur.fetchone()
        
        cur.execute(
            "SELECT id, username, display_name, avatar_color, avatar_url FROM users WHERE id = %s",
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
            'media_url': media_url,
            'created_at': message[1].isoformat(),
            'user': {
                'id': user[0],
                'username': user[1],
                'display_name': user[2],
                'avatar_color': user[3],
                'avatar_url': user[4]
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