import { SendEmailCommand } from '@aws-sdk/client-ses';
import * as aws from '../external-api/aws';
import type { ComponentProps, ComponentType, SvelteComponent } from 'svelte';

type SendEmailParams<T extends SvelteComponent> = {
  subject: string;
  recipient: string;

  template: ComponentType<T>;
  props: ComponentProps<T>;
};

export const sendEmail = async <T extends SvelteComponent>({
  subject,
  recipient,
  template,
  props,
}: SendEmailParams<T>) => {
  // @ts-expect-error svelte internal
  const { head, css, html } = template.render(props);

  const body = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        ${head}
        <style>${css.code}</style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  await aws.ses.send(
    new SendEmailCommand({
      Source: '글리프 <hello@withglyph.com>',
      Destination: { ToAddresses: [recipient] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: body } },
      },
    }),
  );
};

type SendTextEmailParams = {
  subject: string;
  recipient: string;
  body: string;
};

export const sendTextEmail = async ({ subject, recipient, body }: SendTextEmailParams) => {
  await aws.ses.send(
    new SendEmailCommand({
      Source: '글리프 <hello@withglyph.com>',
      Destination: { ToAddresses: [recipient] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } },
      },
    }),
  );
};
