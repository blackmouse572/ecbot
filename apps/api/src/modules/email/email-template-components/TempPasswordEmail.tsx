import React from 'react';
import CreateEmail, { type CreateEmailProps } from './CreateEmail';

const TempPasswordEmail: React.FC<Omit<CreateEmailProps, 'kind'>> = props => (
    <CreateEmail {...props} kind="reset" />
);

export default TempPasswordEmail;
