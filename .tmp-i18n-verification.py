import io
import json
import subprocess

LOCALES = ['en', 'es', 'pt-br', 'ar']


def historic(loc):
    out = subprocess.run(
        ['git', 'show', f'd66bc84^:messages/{loc}.json'],
        capture_output=True, text=True, encoding='utf-8',
    )
    return json.loads(out.stdout)


ERRORS = {
    'en': {
        'verifyNotDone': 'We could not see that on your account yet. Complete the step, then check again.',
        'verifyHandleInvalid': 'That account could not be found. Check the spelling and try again.',
        'telegramCheckinExpired': 'That check-in expired. Open the bot again, then check once more.',
        'invalidDiscordGuildId': 'A Discord server id is 15 to 20 digits.',
    },
    'es': {
        'verifyNotDone': 'Todavía no vemos esa acción en tu cuenta. Completa el paso y vuelve a comprobarlo.',
        'verifyHandleInvalid': 'No encontramos esa cuenta. Revisa el nombre e inténtalo de nuevo.',
        'telegramCheckinExpired': 'Ese registro caducó. Abre el bot de nuevo y comprueba otra vez.',
        'invalidDiscordGuildId': 'El id de un servidor de Discord tiene entre 15 y 20 dígitos.',
    },
    'pt-br': {
        'verifyNotDone': 'Ainda não vemos essa ação na sua conta. Conclua a etapa e verifique novamente.',
        'verifyHandleInvalid': 'Não encontramos essa conta. Confira o nome e tente de novo.',
        'telegramCheckinExpired': 'Esse check-in expirou. Abra o bot novamente e verifique mais uma vez.',
        'invalidDiscordGuildId': 'O id de um servidor do Discord tem de 15 a 20 dígitos.',
    },
    'ar': {
        'verifyNotDone': 'لم نرَ هذا الإجراء في حسابك بعد. أكمِل الخطوة ثم تحقّق مرة أخرى.',
        'verifyHandleInvalid': 'لم نعثر على هذا الحساب. تأكد من كتابة الاسم بشكل صحيح ثم أعد المحاولة.',
        'telegramCheckinExpired': 'انتهت صلاحية هذا التسجيل. افتح البوت مرة أخرى ثم تحقّق من جديد.',
        'invalidDiscordGuildId': 'معرّف سيرفر ديسكورد يتكوّن من 15 إلى 20 رقمًا.',
    },
}

UNLOCK = {
    'en': {
        'verifyHandleHint': 'Enter your {platform} username so we can confirm this step.',
        'verifyConnectHint': 'Connect your {platform} account so it confirms the step itself. We only read; nothing is posted.',
        'verifyCheckinHint': 'Open our bot once so {platform} can tell us which account joined.',
        'verifyHandleLabel': 'Your {platform} username',
        'verifyButton': 'Check',
        'verifyConnectButton': 'Connect {platform}',
        'verifyCheckinButton': 'Open Telegram',
        'verifyCheckinWaiting': 'Waiting for your check-in…',
        'verifyNotDoneYet': 'Your account does not show that step yet. Complete it, then check again.',
        'verifyUnavailable': 'That platform is not responding right now. Try the check again in a moment.',
    },
    'es': {
        'verifyHandleHint': 'Escribe tu usuario de {platform} para que podamos confirmar este paso.',
        'verifyConnectHint': 'Conecta tu cuenta de {platform} para que confirme el paso por sí misma. Solo leemos: no publicamos nada.',
        'verifyCheckinHint': 'Abre nuestro bot una vez para que {platform} nos diga qué cuenta se unió.',
        'verifyHandleLabel': 'Tu usuario de {platform}',
        'verifyButton': 'Comprobar',
        'verifyConnectButton': 'Conectar {platform}',
        'verifyCheckinButton': 'Abrir Telegram',
        'verifyCheckinWaiting': 'Esperando tu registro…',
        'verifyNotDoneYet': 'Tu cuenta todavía no muestra ese paso. Complétalo y vuelve a comprobarlo.',
        'verifyUnavailable': 'Esa plataforma no responde ahora mismo. Vuelve a comprobarlo en un momento.',
    },
    'pt-br': {
        'verifyHandleHint': 'Digite seu usuário no {platform} para confirmarmos esta etapa.',
        'verifyConnectHint': 'Conecte sua conta no {platform} para que ela mesma confirme a etapa. Apenas lemos: nada é publicado.',
        'verifyCheckinHint': 'Abra nosso bot uma vez para que o {platform} nos diga qual conta entrou.',
        'verifyHandleLabel': 'Seu usuário no {platform}',
        'verifyButton': 'Verificar',
        'verifyConnectButton': 'Conectar {platform}',
        'verifyCheckinButton': 'Abrir o Telegram',
        'verifyCheckinWaiting': 'Aguardando seu check-in…',
        'verifyNotDoneYet': 'Sua conta ainda não mostra essa etapa. Conclua e verifique novamente.',
        'verifyUnavailable': 'Essa plataforma não está respondendo agora. Verifique novamente em instantes.',
    },
    'ar': {
        'verifyHandleHint': 'أدخل اسم حسابك في {platform} حتى نتمكن من تأكيد هذه الخطوة.',
        'verifyConnectHint': 'اربط حسابك في {platform} ليؤكّد الخطوة بنفسه. نقرأ فقط ولا ننشر شيئًا.',
        'verifyCheckinHint': 'افتح البوت مرة واحدة ليخبرنا {platform} أي حساب انضم.',
        'verifyHandleLabel': 'اسم حسابك في {platform}',
        'verifyButton': 'تحقّق',
        'verifyConnectButton': 'ربط {platform}',
        'verifyCheckinButton': 'افتح تيليغرام',
        'verifyCheckinWaiting': 'بانتظار تسجيلك…',
        'verifyNotDoneYet': 'لا يظهر هذا الإجراء في حسابك بعد. أكمِل الخطوة ثم تحقّق مرة أخرى.',
        'verifyUnavailable': 'هذه المنصة لا تستجيب الآن. أعد التحقّق بعد قليل.',
    },
}

VERIFICATION = {
    'en': {
        'title': 'Step verification',
        'description': 'What the platforms confirmed for each step on this link.',
        'colStep': 'Step',
        'colOpened': 'Opened',
        'colVerified': 'Confirmed',
        'colUnchecked': 'Not checked',
        'checkable': 'Checked automatically',
        'notCheckable': 'One click',
        'uncheckedNote': '"Not checked" means the platform could not answer: a private profile, a missing credential or an outage. Those visitors were never blocked.',
    },
    'es': {
        'title': 'Verificación de pasos',
        'description': 'Lo que las plataformas confirmaron en cada paso de este enlace.',
        'colStep': 'Paso',
        'colOpened': 'Abiertos',
        'colVerified': 'Confirmados',
        'colUnchecked': 'Sin comprobar',
        'checkable': 'Se comprueba solo',
        'notCheckable': 'Un clic',
        'uncheckedNote': '«Sin comprobar» significa que la plataforma no pudo responder: un perfil privado, una credencial que falta o una caída temporal. Esos visitantes nunca quedaron bloqueados.',
    },
    'pt-br': {
        'title': 'Verificação das etapas',
        'description': 'O que as plataformas confirmaram em cada etapa deste link.',
        'colStep': 'Etapa',
        'colOpened': 'Abertas',
        'colVerified': 'Confirmadas',
        'colUnchecked': 'Não verificadas',
        'checkable': 'Verificada automaticamente',
        'notCheckable': 'Um clique',
        'uncheckedNote': '“Não verificadas” significa que a plataforma não conseguiu responder: perfil privado, credencial ausente ou instabilidade. Esses visitantes nunca foram bloqueados.',
    },
    'ar': {
        'title': 'التحقّق من الخطوات',
        'description': 'ما أكّدته المنصات فعليًا لكل خطوة في هذا الرابط.',
        'colStep': 'الخطوة',
        'colOpened': 'فُتحت',
        'colVerified': 'مؤكّدة',
        'colUnchecked': 'غير مفحوصة',
        'checkable': 'تُفحص تلقائيًا',
        'notCheckable': 'نقرة واحدة',
        'uncheckedNote': '«غير مفحوصة» تعني أن المنصة لم تتمكن من الإجابة: حساب خاص أو بيانات اعتماد ناقصة أو انقطاع مؤقت. لم يُمنع هؤلاء الزوار من الفتح.',
    },
}

FIELDS = {
    'en': {
        'verification_enabled': {
            'label': 'Check steps automatically',
            'hint': 'On: a step the platform can answer for is confirmed against the platform. Off: every step completes with a single click, as before.',
        },
        'verification_oauthRedirectUrl': {
            'label': 'Account connection redirect URL',
            'hint': 'Add this exact address to your Google and GitHub OAuth apps. Visitors land back on their link page after granting read access.',
        },
        'verification_googleClientId': {
            'label': 'Google OAuth client id',
            'hint': 'From console.cloud.google.com: create an OAuth client of type Web application. Needed for YouTube likes and subscriptions, which leave no public record.',
        },
        'verification_googleClientSecret': {
            'label': 'Google OAuth client secret',
            'hint': 'The matching secret. Kept on the server and used only to read the visitor\u2019s own video rating and subscription list.',
        },
        'verification_githubClientId': {
            'label': 'GitHub OAuth client id',
            'hint': 'From github.com/settings/developers: register an OAuth app. Needed for repository stars, which only the starring account can read.',
        },
        'verification_githubClientSecret': {
            'label': 'GitHub OAuth client secret',
            'hint': 'The matching secret from the same OAuth app. No write access is requested.',
        },
    },
    'es': {
        'verification_enabled': {
            'label': 'Comprobar los pasos automáticamente',
            'hint': 'Activado: el paso que la plataforma puede responder se confirma con ella. Desactivado: cada paso se completa con un solo clic, como antes.',
        },
        'verification_oauthRedirectUrl': {
            'label': 'URL de retorno de la conexión de cuenta',
            'hint': 'Añade esta dirección exacta a tus aplicaciones OAuth de Google y GitHub. El visitante vuelve a su enlace después de dar acceso de lectura.',
        },
        'verification_googleClientId': {
            'label': 'Id de cliente OAuth de Google',
            'hint': 'En console.cloud.google.com: crea un cliente OAuth de tipo Aplicación web. Hace falta para los me gusta y las suscripciones de YouTube, que no dejan rastro público.',
        },
        'verification_googleClientSecret': {
            'label': 'Secreto de cliente OAuth de Google',
            'hint': 'El secreto correspondiente. Se guarda en el servidor y solo se usa para leer la valoración y las suscripciones del propio visitante.',
        },
        'verification_githubClientId': {
            'label': 'Id de cliente OAuth de GitHub',
            'hint': 'En github.com/settings/developers: registra una aplicación OAuth. Hace falta para las estrellas de un repositorio, que solo puede leer la cuenta que las dio.',
        },
        'verification_githubClientSecret': {
            'label': 'Secreto de cliente OAuth de GitHub',
            'hint': 'El secreto correspondiente de la misma aplicación. No se pide ningún permiso de escritura.',
        },
    },
    'pt-br': {
        'verification_enabled': {
            'label': 'Verificar as etapas automaticamente',
            'hint': 'Ativado: a etapa que a plataforma consegue responder é confirmada com ela. Desativado: cada etapa se conclui com um clique, como antes.',
        },
        'verification_oauthRedirectUrl': {
            'label': 'URL de retorno da conexão de conta',
            'hint': 'Adicione este endereço exato aos seus apps OAuth do Google e do GitHub. O visitante volta ao link depois de conceder acesso de leitura.',
        },
        'verification_googleClientId': {
            'label': 'Id de cliente OAuth do Google',
            'hint': 'Em console.cloud.google.com: crie um cliente OAuth do tipo Aplicativo da Web. Necessário para curtidas e inscrições do YouTube, que não deixam registro público.',
        },
        'verification_googleClientSecret': {
            'label': 'Segredo de cliente OAuth do Google',
            'hint': 'O segredo correspondente. Fica no servidor e serve apenas para ler a avaliação e as inscrições do próprio visitante.',
        },
        'verification_githubClientId': {
            'label': 'Id de cliente OAuth do GitHub',
            'hint': 'Em github.com/settings/developers: registre um app OAuth. Necessário para as estrelas de um repositório, que só a conta que as deu consegue ler.',
        },
        'verification_githubClientSecret': {
            'label': 'Segredo de cliente OAuth do GitHub',
            'hint': 'O segredo correspondente do mesmo app. Nenhuma permissão de escrita é solicitada.',
        },
    },
    'ar': {
        'verification_enabled': {
            'label': 'فحص الخطوات تلقائيًا',
            'hint': 'عند التفعيل: كل خطوة تستطيع المنصة الإجابة عنها تُؤكَّد منها مباشرة. عند الإيقاف: تكتمل كل خطوة بنقرة واحدة كما كان سابقًا.',
        },
        'verification_oauthRedirectUrl': {
            'label': 'رابط العودة بعد ربط الحساب',
            'hint': 'أضف هذا العنوان كما هو إلى تطبيقات OAuth في Google وGitHub. يعود الزائر إلى صفحة الرابط بعد منح صلاحية القراءة.',
        },
        'verification_googleClientId': {
            'label': 'معرّف عميل OAuth من Google',
            'hint': 'من console.cloud.google.com: أنشئ عميل OAuth من نوع «تطبيق ويب». يلزم لتأكيد الإعجاب والاشتراك في يوتيوب لأنهما لا يتركان أثرًا عامًا.',
        },
        'verification_googleClientSecret': {
            'label': 'المفتاح السري لعميل OAuth من Google',
            'hint': 'المفتاح السري المطابق. يبقى على الخادم ويُستخدم فقط لقائمة اشتراكات الزائر وتقييمه للفيديو.',
        },
        'verification_githubClientId': {
            'label': 'معرّف عميل OAuth من GitHub',
            'hint': 'من github.com/settings/developers: سجّل تطبيق OAuth. يلزم لتأكيد تمييز المستودعات بنجمة، وهو ما لا يقرؤه إلا الحساب نفسه.',
        },
        'verification_githubClientSecret': {
            'label': 'المفتاح السري لعميل OAuth من GitHub',
            'hint': 'المفتاح السري المطابق من التطبيق نفسه. لا نطلب أي صلاحية للكتابة.',
        },
    },
}

# Field order in the panel, so the catalog reads provider by provider.
FIELD_ORDER = [
    'verification_enabled',
    'verification_oauthRedirectUrl',
    'verification_youtubeApiKey',
    'verification_googleClientId',
    'verification_googleClientSecret',
    'verification_githubClientId',
    'verification_githubClientSecret',
    'verification_githubToken',
    'verification_discordBotToken',
    'verification_discordGuildId',
    'verification_telegramBotToken',
    'verification_steamWebApiKey',
    'verification_twitchClientId',
    'verification_twitchClientSecret',
]

for loc in LOCALES:
    path = f'messages/{loc}.json'
    data = json.load(io.open(path, encoding='utf-8'))
    old = historic(loc)
    old_settings = old['admin']['settings']

    data['errors'].update(ERRORS[loc])
    data['errors']['verifyUnavailable'] = old['errors']['verifyUnavailable']

    data['unlock'].update(UNLOCK[loc])

    settings = data['admin']['settings']
    settings.setdefault('groups', {})['step-verification'] = \
        old_settings['groups']['step-verification']
    settings['twitch'] = old_settings['twitch']

    fields = settings['fields']
    restored = {k: v for k, v in old_settings['fields'].items() if k.startswith('verification_')}
    restored['limits_verifyPerMinute'] = old_settings['fields']['limits_verifyPerMinute']
    fields.update(restored)
    fields.update(FIELDS[loc])
    settings['fields'] = {
        k: v for k, v in fields.items() if k not in FIELD_ORDER
    }
    # Re-insert the verification fields in panel order, right after the limits.
    ordered = {}
    for key, value in fields.items():
        if key in FIELD_ORDER:
            continue
        ordered[key] = value
        if key == 'limits_uploadPerHour':
            for name in FIELD_ORDER:
                ordered[name] = fields[name]
    if not any(k in ordered for k in FIELD_ORDER):
        for name in FIELD_ORDER:
            ordered[name] = fields[name]
    settings['fields'] = ordered

    # The shared evidence panel sits beside the unlock namespace it reports on.
    rebuilt = {}
    for key, value in data.items():
        rebuilt[key] = value
        if key == 'unlock':
            rebuilt['verification'] = VERIFICATION[loc]
    if 'verification' not in rebuilt:
        rebuilt['verification'] = VERIFICATION[loc]

    io.open(path, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(rebuilt, ensure_ascii=False, indent=2) + '\n'
    )
    missing = [k for k in FIELD_ORDER if k not in rebuilt['admin']['settings']['fields']]
    print(loc, 'fields ok' if not missing else f'MISSING {missing}',
          '| twitch keys', len(rebuilt['admin']['settings']['twitch']),
          '| verification keys', len(rebuilt['verification']))