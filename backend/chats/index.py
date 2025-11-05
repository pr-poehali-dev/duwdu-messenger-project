'''
Business: Get user chats, create private chats and channels
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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
        search_query = params.get('search', '').strip()
        
        if not user_id and not search_query:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'user_id or search required'})
            }
        
        if search_query:
            cur.execute("""
                SELECT c.id, c.name, c.type, c.username, c.avatar_url, c.description, c.created_at
                FROM chats c
                WHERE (c.username ILIKE %s OR c.name ILIKE %s)
                AND c.type IN ('channel', 'group')
                ORDER BY c.created_at DESC
                LIMIT 50
            """, (f'%{search_query}%', f'%{search_query}%'))
            
            results = []
            for row in cur.fetchall():
                results.append({
                    'id': row[0],
                    'name': row[1],
                    'type': row[2],
                    'username': row[3],
                    'avatar_url': row[4],
                    'description': row[5],
                    'created_at': row[6].isoformat() if row[6] else None
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(results),
                'isBase64Encoded': False
            }
        
        if not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'user_id required'})
            }
        
        cur.execute("""
            SELECT c.id, c.name, c.type, c.created_at, c.username, c.avatar_url,
                   (SELECT content FROM messages WHERE chat_id = c.id AND removed_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message,
                   (SELECT created_at FROM messages WHERE chat_id = c.id AND removed_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message_time,
                   (SELECT message_type FROM messages WHERE chat_id = c.id AND removed_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message_type,
                   cm.unread_count
            FROM chats c
            INNER JOIN chat_members cm ON c.id = cm.chat_id
            WHERE cm.user_id = %s
            ORDER BY last_message_time DESC NULLS LAST, c.created_at DESC
        """, (user_id,))
        
        chats = []
        for row in cur.fetchall():
            chat_data = {
                'id': row[0],
                'name': row[1],
                'type': row[2],
                'created_at': row[3].isoformat() if row[3] else None,
                'username': row[4],
                'avatar_url': row[5],
                'last_message': row[6],
                'last_message_time': row[7].isoformat() if row[7] else None,
                'last_message_type': row[8],
                'unread_count': row[9] or 0
            }
            
            if chat_data['type'] == 'private':
                cur.execute("""
                    SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.is_online
                    FROM users u
                    INNER JOIN chat_members cm ON u.id = cm.user_id
                    WHERE cm.chat_id = %s AND u.id != %s
                    LIMIT 1
                """, (chat_data['id'], user_id))
                other_user = cur.fetchone()
                if other_user:
                    chat_data['other_user'] = {
                        'id': other_user[0],
                        'username': other_user[1],
                        'display_name': other_user[2],
                        'avatar_color': other_user[3],
                        'avatar_url': other_user[4],
                        'is_online': other_user[5]
                    }
            
            chats.append(chat_data)
        
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
        chat_type = body_data.get('type', 'channel')
        user_id = body_data.get('user_id')
        
        if not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'user_id required'})
            }
        
        if chat_type == 'private':
            other_user_id = body_data.get('other_user_id')
            if not other_user_id:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'other_user_id required for private chat'})
                }
            
            cur.execute("""
                SELECT c.id FROM chats c
                INNER JOIN chat_members cm1 ON c.id = cm1.chat_id
                INNER JOIN chat_members cm2 ON c.id = cm2.chat_id
                WHERE c.type = 'private'
                AND cm1.user_id = %s
                AND cm2.user_id = %s
                LIMIT 1
            """, (user_id, other_user_id))
            
            existing_chat = cur.fetchone()
            if existing_chat:
                cur.execute("""
                    SELECT c.id, c.name, c.type, c.created_at
                    FROM chats c
                    WHERE c.id = %s
                """, (existing_chat[0],))
                chat = cur.fetchone()
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'id': chat[0],
                        'name': chat[1],
                        'type': chat[2],
                        'created_at': chat[3].isoformat()
                    }),
                    'isBase64Encoded': False
                }
            
            cur.execute("SELECT username FROM users WHERE id = %s", (other_user_id,))
            other_user = cur.fetchone()
            chat_name = f"Private chat"
            
            cur.execute(
                "INSERT INTO chats (name, type, created_by) VALUES (%s, %s, %s) RETURNING id, name, type, created_at",
                (chat_name, 'private', user_id)
            )
            chat = cur.fetchone()
            
            cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", (chat[0], user_id))
            cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", (chat[0], other_user_id))
            
            conn.commit()
        else:
            name = body_data.get('name', '').strip()
            username = body_data.get('username', '').strip().lower()
            description = body_data.get('description', '').strip()
            avatar_url = body_data.get('avatar_url', '').strip()
            
            if not name:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'name required'})
                }
            
            if username:
                cur.execute("SELECT id FROM chats WHERE username = %s", (username,))
                if cur.fetchone():
                    cur.close()
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Username already taken'})
                    }
                
                cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                if cur.fetchone():
                    cur.close()
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Username already taken by user'})
                    }
            
            cur.execute(
                "INSERT INTO chats (name, type, created_by, username, description, avatar_url) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, name, type, created_at, username, avatar_url",
                (name, chat_type, user_id, username if username else None, description if description else None, avatar_url if avatar_url else None)
            )
            chat = cur.fetchone()
            
            cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", (chat[0], user_id))
            conn.commit()
        
        cur.close()
        conn.close()
        
        result = {
            'id': chat[0],
            'name': chat[1],
            'type': chat[2],
            'created_at': chat[3].isoformat(),
            'username': chat[4] if len(chat) > 4 else None,
            'avatar_url': chat[5] if len(chat) > 5 else None
        }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(result),
            'isBase64Encoded': False
        }
    
    if method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        chat_id = body_data.get('chat_id')
        user_id = body_data.get('user_id')
        avatar_url = body_data.get('avatar_url')
        
        if not chat_id or not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'chat_id and user_id required'})
            }
        
        cur.execute("SELECT created_by FROM chats WHERE id = %s", (chat_id,))
        chat = cur.fetchone()
        
        if not chat or chat[0] != int(user_id):
            cur.close()
            conn.close()
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Only creator can update chat'})
            }
        
        cur.execute(
            "UPDATE chats SET avatar_url = %s WHERE id = %s",
            (avatar_url, chat_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }