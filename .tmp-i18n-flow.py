import io
import json

FLOW_BODY = {
    'en': 'Visitors always know exactly what is left to do. Every step is tracked on our servers, and where the platform keeps a record we confirm the action against it.',
    'es': 'Los visitantes siempre saben exactamente qué les queda por hacer. Cada paso se registra en nuestros servidores y, cuando la plataforma guarda un registro, confirmamos la acción con ella.',
    'pt-br': 'Os visitantes sempre sabem exatamente o que falta fazer. Cada etapa é registrada nos nossos servidores e, quando a plataforma guarda um registro, confirmamos a ação com ela.',
    'ar': 'يعرف الزوار دائمًا ما تبقّى عليهم بالضبط. تُسجَّل كل خطوة على خوادمنا، وحين تحتفظ المنصة بسجل نؤكّد الإجراء منها.',
}
VERIFY_DETAIL = {
    'en': 'Confirmed with the platform where it keeps a record.',
    'es': 'Confirmado con la plataforma cuando guarda un registro.',
    'pt-br': 'Confirmada com a plataforma quando ela guarda um registro.',
    'ar': 'تُؤكَّد من المنصة حين تحتفظ بسجل.',
}
BULLET_SERVER = {
    'en': 'Steps are confirmed with the platform wherever it keeps a record.',
    'es': 'Los pasos se confirman con la plataforma siempre que guarda un registro.',
    'pt-br': 'As etapas são confirmadas com a plataforma sempre que ela guarda um registro.',
    'ar': 'تُؤكَّد الخطوات من المنصة كلما احتفظت بسجل.',
}

for loc in ['en', 'es', 'pt-br', 'ar']:
    path = f'messages/{loc}.json'
    data = json.load(io.open(path, encoding='utf-8'))
    data['home']['flow']['body'] = FLOW_BODY[loc]
    data['home']['flow']['nodes']['verifyDetail'] = VERIFY_DETAIL[loc]
    data['create']['bulletServer'] = BULLET_SERVER[loc]
    io.open(path, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    )
    print(loc, 'flow + create bullet updated')
